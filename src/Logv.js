class Logv
{
    constructor()
    {
        var self = this;
        self.markGenId = 0;
        self.marks = new Map;
        self.$ = jQuery;
        if (undefined == Logv.opened)
        {
            Logv.opened = new Map;
        }
    }

    open(path)
    {
        var self = this;
        var openreq = self.$.get("/logv/open?path=" + path, function (resp) {
            var resp = JSON.parse(resp);
            self.onOpenRsp(resp) });
    }

    onOpenRsp(resp)
    {
        var self = this;
        console.log("onOpenRsp:", resp)

        if ("OK" != resp.status)
        {
            $("#dialog-error-text").text("Status code: " + resp.status);
            $("#dialog-error").dialog("open");
            return;
        }

        self.mainTabId = "tab-main-div-" + resp.id;
        self.id = resp.id;
        self.parentId = resp.original_id;
        Logv.opened.set(self.id, this);
        Logv.lastOpened = this;
        self.size = resp.size;
        self.path = resp.path;

        self.tab = document.createElement("li");
        var tablink =  document.createElement("a");
        tablink.href = "#" + self.mainTabId;
        tablink.innerText = self.path;
        self.tab.append(tablink);
        $(tablink).bind("click", function(){
            self.loadPanel();
            self.viewer.updateDisplay();
        });
        self.tabMain = document.getElementById("tab-main");
        $("#tab-main-ul").append(self.tab);
        
        self.tabContent = document.createElement("div");
        self.tabContent.id = self.mainTabId;
        self.tabContent.style.padding = "0px";
        self.tabMain.append(self.tabContent);

        $(self.tabMain).tabs("refresh");

        self.panelMain = document.getElementById("panel-main");

        self.viewer = new Viewer(self.tabContent, self.size, function(offset, size, reqcontext, resultCallback) {
            self.$.get("/logv/get?id=" + self.id + "&line=" + offset + "&size=" + size, function (resp) {
                var resp = JSON.parse(resp);
                if (resp.content.length)
                {
                    resultCallback(resp, reqcontext);
                    // window.setTimeout(resultCallback, 0, resp, reqcontext);
                }
            });
        }, function(element) {
            self.onViewUpdate(element);
        });
    }

    loadPanel()
    {
        var self = this;
        if (undefined == self.panelMain.dataset.id || self.parentId != self.panelMain.dataset.id)
        {
            self.panelMain.dataset.id = self.parentId;
        }
        else
        {
            return;
        }

        self.panelMain.dataset.id = self.parentId;
        self.panelMain.innerHTML = "";

        self.panelMain.className = "";
        self.panelMain.style = "";

        var tab         = document.createElement("div");
        var content     = document.createElement("div");
        var ulTab       = document.createElement("ul");
        var liBookmark  = document.createElement("li");
        var liHighlight = document.createElement("li");
        var contentBookmark  = document.createElement("div");
        var contentHighlight = document.createElement("div");

        // create tab
        liBookmark.innerHTML  = "<a href='#panel-main-bookmark'>Bookmark</a>"
        liHighlight.innerHTML = "<a href='#panel-main-highlight'>Highlight</a>"
        ulTab.append(liBookmark);
        ulTab.append(liHighlight);
        tab.append(ulTab);

        // create content
        contentBookmark.id  = "panel-main-bookmark";
        tab.append(contentBookmark);

        contentHighlight.id = "panel-main-highlight";
        var inputRegex    = document.createElement("input");
        var inputFgColor  = document.createElement("input");
        var inputBgColor  = document.createElement("input");
        var inputButton   = document.createElement("input");
        self.ulMarklist   = document.createElement("ul");

        inputRegex.type  = "text";
        inputRegex.value = "regex";
        inputRegex.style.width = "100px";

        inputFgColor.type  = "text";
        inputFgColor.value = "fgcolor";
        inputFgColor.style.width = "100px";

        inputBgColor.type  = "text";
        inputBgColor.value = "bgcolor";
        inputBgColor.style.width = "100px";

        inputButton.type = "button";
        inputButton.value = "mark";

        var addMarkToList = function(id, mark) {
            var liMark = document.createElement("li");
            liMark.innerText = id + " : " +mark.regex.toString() + " " + mark.fgColor + " over " + mark.bgColor;
            var remover = document.createElement("input");
            remover.type = "button";
            remover.value = "remove";
            self.$(remover).bind("click", function() {
                self.removeMark(id);
                liMark.remove();
            });
            liMark.append(remover);
            self.ulMarklist.append(liMark);
        };

        self.$(inputButton).bind('click', function(){
            var id = self.addMark(new RegExp(inputRegex.value), inputFgColor.value, inputBgColor.value);
            var mark = self.marks.get(id);
            addMarkToList(id, mark);
        });

        self.marks.forEach(function(value,key) {
            addMarkToList(key, value);
        });

        contentHighlight.append(inputRegex);
        contentHighlight.append(inputFgColor);
        contentHighlight.append(inputBgColor);
        contentHighlight.append(inputButton);
        contentHighlight.append(self.ulMarklist);

        tab.append(contentHighlight);

        // decorate
        self.$(tab).tabs();
        self.panelMain.append(tab);
        self.panelMain.append(content);
    }

    onViewUpdate(element)
    {
        var self = this;
        var tomark = self.tabContent;
        if (undefined != element)
        {
            tomark = element;
        }
        else
        {
            $(tomark).unmark();
        }
        self.marks.forEach(function(value,index){
            $(tomark).markRegExp(value.regex, {className: "mark-"+index});
            var marked = $(".mark-"+index);
            marked.css("background",value.bgColor);
            marked.css("color",value.fgColor);
        });
    }

    addMark(regex, fgColor, bgColor)
    {
        var self = this;
        var id = self.markGenId++;
        self.marks.set(id, {
            regex: regex,
            fgColor: fgColor,
            bgColor: bgColor
        });
        self.onViewUpdate();
        return id;
    }

    removeMark(markNumber)
    {
        var self = this;
        self.marks.delete(markNumber);
        self.onViewUpdate();
    }
}
