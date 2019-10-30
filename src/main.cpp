#include <httplib.h>
#include <sstream>
#include <Logv.hpp>

int main(void)
{
    using namespace httplib;

    Server svr;
    Logv logv;

    svr.Get("/logv/open", [&](const Request& req, Response& res) {
        auto rv = logv.open(req.params);
        res.set_content(rv.c_str(), "text/plain");
    });

    svr.Get("/logv/close", [&](const Request& req, Response& res) {
        auto rv = logv.close(req.params);
        res.set_content(rv.c_str(), "text/plain");
    });

    svr.Get("/logv/list", [&](const Request& req, Response& res) {
        auto rv = logv.list(req.params);
        res.set_content(rv.c_str(), "text/plain");
    });

    svr.Get("/logv/get", [&](const Request& req, Response& res) {
        auto rv = logv.get(req.params);
        res.set_content(rv.c_str(), "text/plain");
    });

    svr.Get("/logv/grep", [&](const Request& req, Response& res) {
        auto rv = logv.grep(req.params);
        res.set_content(rv.c_str(), "text/plain");
    });
    
    svr.Get("/logv/find", [&](const Request& req, Response& res) {
        auto rv = logv.find(req.params);
        res.set_content(rv.c_str(), "text/plain");
    });

    svr.set_base_dir("/home/cloud9/workspace");
    svr.listen("0.0.0.0", 9000);
}