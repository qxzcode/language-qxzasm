/////////////////
// compiler.js //
/////////////////


var error,errCallback;
function compile(input,errCb) {
  errCallback = errCb || function(msg) {};
  errCbMsg = "";
  error = false;
  
  // init and remove comments
  input = ("\n"+input+"\n").replace(/\/\/[^\n]*\n/g, "\n");
  var tokenRx = /\s*(?:(\d+)|\$([0-9a-fA-F]+)|(\w+)|(\S))/gm;
  var eof = false;
  function getTok() {
    var m = tokenRx.exec(input);
    var num=null,word=null,char=null;
    if (m) {
      if (m[1]) { // decimal literal
        num = parseInt(m[1]);
      } else if (m[2]) { // hex literal
        num = parseInt(m[2],16);
      } else if (m[3]) { // word
        word = m[3];
      } else if (m[4]) { // other character
        char = m[4];
      }
    } else eof = true;
    return {str:m&&(m[1]||m[2]||m[3]||m[4]),num:num,word:word,char:char};
  }
  function getWordTok() {
    var t = getTok();
    if (!t.word) {
      err("Word expected");
      return "[error]";
    }
    return t.word;
  }
  var scopes = [];
  function addScope() {
    scopes.push({vars:{}});
  }
  function addVar(type,name) {
    scopes[scopes.length-1].vars[name] = {type:type};
  }
  
  var output = "BEGIN\n";
  
  addScope();
  while (!eof && !error) {
    function parseExpr() {
      addScope();
      
      scopes.pop();
    }
    
    var t1 = getTok();
    if (t1.word) {
      var t2 = getTok();
      if (t2.word) {
        var t3 = getTok();
        if (t3.char) {
          if (t3.char==";") { // var definition
            addVar(t1.word,t2.word);
          } else if (t3.char=="=") { // var definition w/ assignment
            parseExpr();
          } else err("Unexpected token: "+t3.str);
        } else err("Unexpected token: "+t3.str);
      } else err("Unexpected token: "+t2.str);
    } else err("Unexpected token: "+t1.str);
  }
  
  if (error)
    errCallback(errCbMsg.trim());
  return error? null : output;
}

var errCbMsg;
function err(msg) {
  errCbMsg += msg+"\n";
  error = true;
}



module.exports = {
  compile: compile
};
