class Viewer
{
    constructor(element, size, contentCallback, displayUpdateCallback)
    {
        var self = this;
        var i;

        self.logsize      = size;
        self.pageLineSize = 100;
        self.lineHeight   = 20;
        self.scroll       = 0;
        self.scrollx      = 0;
        self.contentCallback = contentCallback;
        self.displayUpdateCallback = displayUpdateCallback;
        self.scroller2Disabled = false;
        self.pageCount  = 10;
        self.$ = jQuery; /* global jQuery */
        self.element = self.$(element);
        self.container = document.createElement("div");
        self.container.style.display             = "grid";
        self.container.style.gridTemplateColumns = "1fr auto";
        self.container.style.gridTemplateRows    = "1fr auto";
        self.container.style.height    = "100%";
        self.container.style.width     = "100%";
        self.container.style.padding   = "0px";
        self.container.style.margin    = "0px";

        self.element.html();
        self.element[0].append(self.container);

        self.content = document.createElement("div");
        self.content.style.background = "brown";
        self.content.style.height     = "100%";
        self.content.style.position   = "relative";
        self.content.style.overflow   = "hidden";
        self.content.gridRow          = "1/2"
        self.content.gridColumn       = "1/2"

        $(self.content).bind('mousewheel', function (e) {
            if (e.originalEvent.wheelDelta / 120 > 0)
            {
                self.onSlide(self.scroll-1);
            }
            else
            {
                self.onSlide(self.scroll+1);
            }
        });

        self.contentPages  = new Array();
        var pageColors = ["blue","green","red","cyan","yellow","magenta"];

        for (i=0; i<self.pageCount; i++)
        {
            self.contentPages[i] = document.createElement("div")
            self.contentPages[i].style.position   = "absolute";
            self.contentPages[i].style.background = pageColors[i%pageColors.length];
            self.content.append(self.contentPages[i]);
        }

        self.container.append(self.content);

        var scrollerContainer = document.createElement("div");
        scrollerContainer.style.background = "green";
        scrollerContainer.style.height     = "100%";
        scrollerContainer.style.display    = "flex";
        scrollerContainer.style.alignItems      = "center";
        scrollerContainer.style.justifyContent  = "center";
        scrollerContainer.style.gridRow    = "1/2"
        scrollerContainer.style.gridColumn = "2/3"

        var scrollerContainer2 = document.createElement("div");
        scrollerContainer2.style.background = "green";
        scrollerContainer2.style.width     = "100%";
        scrollerContainer2.style.display    = "flex";
        scrollerContainer2.style.alignItems     = "center";
        scrollerContainer2.style.justifyContent = "center";
        scrollerContainer2.style.gridRow    = "2/3"
        scrollerContainer2.style.gridColumn = "1/2"

        self.scroller = document.createElement("div");
        self.scroller.style.height        = "calc(100% - 40px)";
        self.scroller.style.background    = "black";
        self.scroller.style.border        = "0px";

        self.scroller2 = document.createElement("div");
        self.scroller2.style.width        = "calc(100% - 40px)";
        self.scroller2.style.background   = "black";
        self.scroller2.style.border       = "0px";

        scrollerContainer.append(self.scroller);
        scrollerContainer2.append(self.scroller2);
        self.container.append(scrollerContainer);
        self.container.append(scrollerContainer2);

        self.createSlider();

        self.onSlide(0);
    }

    fetch(offset, size, page)
    {
        // console.log("fetch", offset, size, page)
        var self = this;
        var reqcontext = {line:offset, page:page};
        self.contentCallback(offset, size, reqcontext,
        function(value, context){self.onData(value, context);});
    }

    setSize(size)
    {
        var self = this;
        self.size = size;
        self.createSlider();
    }

    createSlider()
    {
        var self = this;
        self.$(self.scroller).slider({
            orientation: "vertical",
            min: 1,
            max: self.logsize,
            value: self.logsize,
            slide: function (event, ui)
            {
                var value = self.logsize-ui.value;
                self.onSlide(value);
            }
        });
        self.$(self.scroller2).slider({
            orientation: "horizontal",
            min: 0,
            max: 1000,
            value: 0,
            slide: function (event, ui)
            {
                self.scrollx = ui.value;
                self.updateDisplay();
            }
        });
    }

    onSlide(value)
    {
        var self = this;
        if (value<0)
        {
            value=0;
        }
        else if (value>=(self.logsize-1))
        {
            value = self.logsize-1;
        }
        self.scroll = value;
        self.container.dataset.scroll = value;
        if (undefined != self.updateTimer)
        {
            return;
        }

        self.$(self.scroller).slider("value", self.logsize-self.scroll);

        self.updateTimer = window.setTimeout(
            function() {
                self.updateTimer = undefined;
                self.updateDisplay();
            }, 100);
    }

    onData(value, context)
    {
        var self = this;
        var page = self.contentPages[context.page]
        var i=0;

        if (undefined == page.dataset.requestLine || page.dataset.requestLine != context.line)
        {
            return;
        }

        page.innerHTML = "";
        page.dataset.line = context.line;

        for(i=0; i<value.content.length; i++)
        {
            var gutter = document.createElement("span");
            gutter.innerText = value.content[i].line + "  ";

            var line = document.createElement("span");
            line.innerText = value.content[i].string;

            var log = document.createElement("div");
            log.style.overflowY = "hidden";
            log.style.height = self.lineHeight + "px";
            log.className = "logline";
            log.append(gutter);
            log.append(line);

            page.append(log)
        }
        
        self.calculateMaxWidth();
        self.displayUpdateCallback(page);
    }

    calculateMaxWidth()
    {
        var self = this;
        var maxWidth = 0;
        var i;
        for (i=0; i<self.pageCount; i++)
        {
            var currentPage = self.contentPages[i];
            var width = parseFloat(window.getComputedStyle(currentPage).width);
            // console.log("calculateMaxWidth width:", window.getComputedStyle(currentPage).width);
            if (width>maxWidth)
            {
                maxWidth = width;
            }
        }
        self.maxWidth = maxWidth;
        var contentWidth = parseFloat(window.getComputedStyle(self.content).width);
        var width = self.maxWidth-contentWidth;

        if (width>0)
        {
            self.$(self.scroller2).slider("option", "disabled", false);
            self.scroller2Disabled = false;
            self.$(self.scroller2).slider("option", "max", width);
        }
        else if(width<=0 && self.scroller2Disabled == false)
        {
            self.scroller2Disabled = true;
            self.$(self.scroller2).slider("option", "disabled", true);
            self.$(self.scroller2).slider("value", 0);
            self.scrollx = 0;
        }
    }

    updateDisplay()
    {
        var self = this;
        var i;
        var pageNumber = Math.floor(self.scroll/self.pageLineSize);
        var pageIndex = pageNumber%self.pageCount;
        var pageHeight = self.pageLineSize*self.lineHeight;
        var offset = (self.scroll%self.pageLineSize)*self.lineHeight;
        // console.log("updateDisplay scroll:", self.scroll, "page:", pageNumber,"page-index:",pageIndex);
        for (i=0; i<self.pageCount; i++)
        {
            var currentPage = self.contentPages[i];
            var positionToCurrentPage = i-pageIndex;
            var rawIndex = positionToCurrentPage%self.pageCount;
            var index = rawIndex;

            if (index<=(-self.pageCount/2))
            {
                index = self.pageCount + index;
            }
            else if (index > self.pageCount/2)
            {
                index =-(self.pageCount - index);
            }

            var currentLine = (pageNumber+index)*self.pageLineSize;

            // console.log("E:", i, "data-line", currentLine, "index", index, "width:",width);
            currentPage.style.top  = (index*pageHeight-offset)+"px";
            currentPage.style.left = -self.scrollx+"px";

            if (currentLine >= self.logsize || currentLine < 0)
            {
                currentPage.innerHTML = "end";
                currentPage.dataset.requestLine = -1;
                continue;
            }

            if (currentLine<=self.logsize && currentLine>=0 && ("end" == currentPage.innerHTML || undefined == currentPage.dataset.line || currentLine != currentPage.dataset.line))
            {
                currentPage.innerHTML = "loading...";
                currentPage.dataset.requestLine = currentLine; 
                self.fetch(currentLine, self.pageLineSize, i);
            }
        }

        self.calculateMaxWidth();
    }
}