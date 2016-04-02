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
  var lastTokI = 0;
  function getTok() {
    var m = eof? null : tokenRx.exec(input);
    var num=null,word=null,char=null;
    if (m) {
      lastTokI = m.index;
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
  function assertChar(c) {
    var t = getTok();
    if (t.char!=c)
      badTok(t);
  }
  function backTok() {
    tokenRx.lastIndex = lastTokI;
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
    scopes[scopes.length-1].vars[name] = {name:name,type:type,loc:"b"};
  }
  function getVar(name) {
    for (var i=scopes.length-1; i>=0; i--) {
      var v = scopes[i].vars[name];
      if (v) return v;
    }
    return null;
  }
  
  var output = "BEGIN\n";
  
  addScope();
  while (!eof && !error) {
    function parseExpr() {
      var expr = [],last=["op"];
      var done = false;
      while (!eof && !error && !done) {
        var t = getTok();
        function char(c) {
          if ((c==")"||c==";"||c==",")&&expr.length>0) {
            done = true;
            backTok();
          } else if (c=="(") {
            if (last[0]!="op") badTok(t);
            else {
              expr.push(last=parseExpr());
              assertChar(")");
            }
          } else if (c=="+"||c=="-"||c=="*") {
            if (last[0]=="op"&&expr.length>0) badTok(t);
            else expr.push(last=["op",c]);
          } else badTok(t);
        }
        if (t.num!=null) {
          if (last[0]!="op") badTok(t);
          else expr.push(last=["num",t.num]);
        } else if (t.char) {
          char(t.char);
        } else if (t.word) {
          if (last[0]!="op") badTok(t);
          var t2 = getTok();
          if (t2.char=="(") { // function call
            //...
            err("Function call in parseExpr");
          } else {
            var v = getVar(t.word);
            if (v) expr.push(last=["var",v]);
            else badVar(t.word);
            backTok();
          }
        }
      }
      if (error) return ["num",-1];
      if (eof) badEOF();
      if (last[0]=="op") err("Expected token after "+last[1]);
      if (expr[0][0]=="op") {
        var op = expr[0][1];
        if (op=="+"||op=="-")
          expr.unshift(["num",0]);
        else err("Expected token before "+op);
      }
      
      var adds=[], mult, lastMult=false, lastOp="+";
      for (var i=0; i<expr.length; i+=2) {
        var val = expr[i];
        var op = expr[i+1];
        op = op&&op[1];
        isMult = op=="*";
        if (lastMult) {
          mult.push(val);
          if (!isMult) {
            var con = 1;
            for (var j=0; j<mult.length; j++) {
              var t = mult[j];
              if (t[0]=="num") {
                con *= t[1];
                mult.splice(j--,1);
              }
              if (t[0]=="mul") {
                mult.splice.apply(mult,[j--,1].concat(t[1]));
              }
            }
            if (con!=1 || mult.length==0) {
              mult.push(["num",con]);
            }
            adds.push([lastOp=="+",mult.length==1?mult[0]:["mul",mult]]);
          }
        } else if (isMult) mult = [val];
        else adds.push([lastOp=="+",val]);
        if (!isMult) lastOp = op;
        lastMult = isMult;
      }
      
      var con = 0;
      for (var i=0; i<adds.length; i++) {
        var t = adds[i];
        var p=t[0], v=t[1];
        if (v[0]=="num") {
          con += v[1]*(p?1:-1);
          adds.splice(i--,1);
        }
        if (v[0]=="add") {
          adds.splice.apply(adds,[i--,1].concat(v[1]));
        }
      }
      if (con!=0 || adds.length==0) {
        var p = con>=0;
        adds.push([p,["num",p?con:-con]]);
      }
      
      if (adds.length==1) {
        var a = adds[0];
        if (a[1][0]=="num") // whole expression is a constant
          return ["num",a[1][1]*(a[0]?1:-1)];
        if (a[1][0]=="mul" && a[0]) // whole expression is a mul set
          return a[1];
      }
      return ["add",adds];
    }
    function codeExpr(expr,arr) {
      arr = arr || [];
      
      return arr;
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
            addVar(t1.word,t2.word);
            codeExpr(parseExpr());
            assertChar(";");
          } else badTok(t3);
        } else badTok(t3);
      } else badTok(t2);
    } else if (t1.str) badTok(t1);
  }
  
  if (error)
    errCallback(errCbMsg.trim());
  return error? null : output;
}

var errCbMsg;
function err(msg) {
  if (!error)
    errCbMsg += msg+"\n";
  error = true;
}
function badTok(t) {
  if (t.str) err("Unexpected token: "+t.str);
  else badEOF();
}
function badEOF() {
  err("Premature EOF");
}
function badVar(name) {
  err("Undeclared variable: "+name);
}



module.exports = {
  compile: compile
};
