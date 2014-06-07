/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */
 
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
    'use strict';

    // Brackets modules
    var EditorManager   = brackets.getModule("editor/EditorManager");
    var CommandManager    = brackets.getModule("command/CommandManager");
    var Menus           = brackets.getModule("command/Menus");
    var DocumentManager = brackets.getModule("document/DocumentManager");
    var GET_DIMENSIONS = "get_dimensions";
    
    /**
     * Return the token string that is at the specified position.
     *
     * @param hostEditor {!Editor} editor
     * @param {!{line:Number, ch:Number}} pos
     * @return {String} token string at the specified position
     */
    function _getStringAtPos(hostEditor, pos) {
        var token = hostEditor._codeMirror.getTokenAt(pos, true);
        
        // If the pos is at the beginning of a name, token will be the 
        // preceding whitespace or dot. In that case, try the next pos.
        if (token.string.trim().length === 0 || token.string === ".") {
            token = hostEditor._codeMirror.getTokenAt({line: pos.line, ch: pos.ch + 1}, true);
        }
        
        if (token.type === "string") {
            var string = token.string;
            
            // Strip quotes
            var ch = string[0];
            if (ch === "\"" || ch === "'") {
                string = string.substr(1);
            }
            ch = string[string.length - 1];
            if (ch === "\"" || ch === "'") {
                string = string.substr(0, string.length - 1);
            }
            
            return string;
        } else {
            
            // Check for url(...);
            var line = hostEditor._codeMirror.getLine(pos.line);
            var match = /url\s*\(([^)]*)\)/.exec(line);
            
            if (match && match[1]) {
                // URLs are relative to the doc
                var docPath = hostEditor.document.file.fullPath;
                
                docPath = docPath.substr(0, docPath.lastIndexOf("/"));
                
                return docPath + "/" + match[1];
            }
        }
        
        return "";
    }
    
    /**
     * This function is registered with EditManager as an inline editor provider. It creates an inline editor
     * when cursor is on a JavaScript function name, find all functions that match the name
     * and show (one/all of them) in an inline editor.
     *
     * @param {!Editor} editor
     * @param {!{line:Number, ch:Number}} pos
     * @return {$.Promise} a promise that will be resolved with an InlineWidget
     *      or null if we're not going to provide anything.
     */
    function inlineImageViewerProvider(hostEditor, pos) {
        
        // Only provide image viewer if the selection is within a single line
        var sel = hostEditor.getSelection(false);
        if (sel.start.line !== sel.end.line) {
            return null;
        }
        
        // Always use the selection start for determining the image file name. The pos
        // parameter is usually the selection end.        
        var fileName = _getStringAtPos(hostEditor, hostEditor.getSelection(false).start);
        if (fileName === "") {
            return null;
        }
        
        // Check for valid file extensions
        if (!/(.png|.jpg|.jpeg|.gif|.svg)$/i.test(fileName)) {
            return null;
        }
        
        var currentDoc = DocumentManager.getCurrentDocument();
        var filePath = currentDoc.file.fullPath.substr(0,currentDoc.file.fullPath.lastIndexOf("/"));
        _loadImage(filePath + '/' + fileName);
	    var result = new $.Deferred();

        return result.promise();
    }
    var _loadImage = function(imgPath) {
		// The convert to data trick
		var imgee = new Image();
		imgee.src = imgPath;
		imgee.onload = function () {
            var size = "\t" + "width: " + this.width + "px;"  + "\n\t" + "height:" + this.height + "px;" + "\n";
            var currentDoc = DocumentManager.getCurrentDocument();
            var editor = EditorManager.getFocusedEditor();
            var pos = editor.getCursorPos(true);
            
            currentDoc.replaceRange(size, {line: pos.line + 1, ch: 0});
        };        
	};
    
    var _getDimension = function () {
        inlineImageViewerProvider(EditorManager.getCurrentFullEditor(),EditorManager.getCurrentFullEditor().getCursorPos());
    };


    var buildMenu = function (m) {
        m.addMenuDivider();
        m.addMenuItem(GET_DIMENSIONS);
    };

    CommandManager.register("Get image dimension", GET_DIMENSIONS, _getDimension);


    var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    buildMenu(menu);

    var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
    buildMenu(contextMenu);
    
});