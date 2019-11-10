#pragma once

#include <map>
#include <regex>
#include <vector>
#include <fstream>

using ArgsMap = std::multimap<std::string,std::string>;

struct LogEntry
{
    uint64_t logNumber;
    uint64_t originalLogNumber;
    std::string logString;
};

struct LogFile
{
    std::string path;
    uint64_t parentFile;
    std::string logData;
    std::string clientData;
    std::vector<LogEntry> logLines;
};

namespace detail
{
    bool replace(std::string& str, const std::string& from, const std::string& to)
    {
        size_t start_pos = str.find(from);
        if(start_pos == std::string::npos) return false;
        str.replace(start_pos, from.length(), to);
        return true;
    }
    
    void replaceAll(std::string& str, const std::string& from, const std::string& to)
    {
        if(from.empty())
            return;
        size_t start_pos = 0;
        while((start_pos = str.find(from, start_pos)) != std::string::npos)
        {
            str.replace(start_pos, from.length(), to);
            start_pos += to.length(); // In case 'to' contains 'from', like replacing 'x' with 'yx'
        }
    }
}

class Logv
{
public:
    std::string close(const ArgsMap&) {return "{\"status\":\"NOT_IMPLEMENTED\"}";}
    std::string find(const ArgsMap&) {return "{\"status\":\"NOT_IMPLEMENTED\"}";}
    std::string get(const ArgsMap& pArgs)
    {
        auto findIt = pArgs.find("id");
        if (pArgs.end()==findIt)
        {
            return "{\"status\":\"NO_ID\"}";
        }

        uint64_t id = std::stoull(findIt->second);

        findIt = pArgs.find("line");
        if (pArgs.end()==findIt)
        {
            return "{\"status\":\"NO_LINE\"}";
        }

        uint64_t line = std::stoull(findIt->second);

        findIt = pArgs.find("size");
        if (pArgs.end()==findIt)
        {
            return "{\"status\":\"NO_SIZE\"}";
        }

        uint64_t size = std::stoull(findIt->second);

        LogFile *lf;
        {
            std::unique_lock<std::mutex> lg(mLogFilesMutex);
            auto fileIt = mLogFiles.find(id);
            if (mLogFiles.end()==fileIt)
            {
                return "{\"status\":\"INVALID_ID\"}";
            }
            lf = &fileIt->second;
        }

        auto& logFile = *lf;

        std::string rv = "{";
        rv += "\"content\":[";
        static const std::string fr1 = "\\";
        static const std::string to1 = "\\\\";
        static const std::string fr2 = "\"";
        static const std::string to2 = "\\\"";
        for (uint64_t i=line; i<(line+size) && i<logFile.logLines.size(); i++)
        {
            rv += "{";
            rv += "\"line\":" + std::to_string(logFile.logLines[i].logNumber);
            rv += ", \"original_line\":" + std::to_string(logFile.logLines[i].originalLogNumber);
            auto cleanstr = logFile.logLines[i].logString;
            detail::replaceAll(cleanstr, fr1, to1);
            detail::replaceAll(cleanstr, fr2, to2);
            rv += ", \"string\":\"" + cleanstr + "\"";
            rv += "},";
        }
        if (rv.size() && ','==rv[rv.size()-1])
        {
            rv.pop_back();
        }
        rv += "]}";
        return rv;
    }

    std::string grep(const ArgsMap&) {return "{\"status\":\"NOT_IMPLEMENTED\"}";}

    std::string list(const ArgsMap&)
    {   std::string rv = "{\"open_files\":[";
        std::unique_lock<std::mutex> lg(mLogFilesMutex);
        for (auto& i : mLogFiles)
        {
            rv += "{\"status\":\"OK\",\"path\":\""+i.second.path+"\",\"id\":\""+ std::to_string(i.first) + "\",\"original_id\":" + std::to_string(i.second.parentFile) +",\"size\":"+ std::to_string(i.second.logLines.size()) +"},";
        }
        if (rv.size() && ','==rv[rv.size()-1])
        {
            rv.pop_back();
        }
        rv += "]}";
        return rv;
    }

    std::string open(const ArgsMap& pArgs)
    {
        auto findIt = pArgs.find("path");
        if (pArgs.end()==findIt)
        {
            return "{\"status\":\"NO_PATH\"}";
        }

        std::fstream fs(findIt->second, std::ios::in);

        if (!fs.is_open())
        {
            return "{\"status\":\"FILE_NOT_OPEN\"}";
        }

        if (!fs.good())
        {
            return "{\"status\":\"BAD_FILE\"}";
        }
        
        std::string line;

        auto id = mGenId.fetch_add(1);
        LogFile* lf;
        {
            std::unique_lock<std::mutex> lg(mLogFilesMutex);
            lf = &mLogFiles.emplace(id, LogFile{}).first->second;
        }
        for (uint64_t n=0; std::getline(fs, line); n++)
        {
            lf->logLines.emplace_back(LogEntry{n,n,std::move(line)});
        }

        lf->parentFile = id;
        lf->path = findIt->second;
        return std::string() + "{\"status\":\"OK\",\"path\":\""+lf->path+"\",\"id\":\""+ std::to_string(id) + "\",\"original_id\":" + std::to_string(lf->parentFile) +",\"size\":"+ std::to_string(lf->logLines.size()) +"}";
    }
private:
    std::atomic<uint32_t> mGenId=0;
    std::map<uint64_t, LogFile> mLogFiles;
    std::mutex mLogFilesMutex;
};