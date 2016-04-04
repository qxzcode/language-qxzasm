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
  function addScope(isLC) {
    scopes.push({
      parent:curScope(),
      isLC:!!isLC, // is loop or conditional
      vars:{},
      isRelLC:function(top) {
        return this==top? false : this.isLC||parent.isRelLC(top);
      }
    });
  }
  function popScope() {
    var s = scopes.pop();
    // optimize variable usage
    do {
      var mod = false;
      for (var i in s.vars) {if(i=="count")continue;
        var v = s.vars[i];
        if (v.reads.length==0) {
          console.log("Variable "+v.name+" never read");
          var ws = v.writes.slice(); // shallow copy to avoid interference with rmCmd
          for (var j in ws) rmCmd(ws[j]); // all writes are unnecessary
          delete s.vars[i];
          mod = true;
        } else if (v.reads.length==1) {
          var r = v.reads[0];
          console.log(v.name+" has 1 read: "+r);
          if (r[0]=="ld" && !r[1].isReadBetween(_,_)) {
            
          }
        }
      }
    } while (mod);
  }
  function curScope() {
    return scopes[scopes.length-1] || null;
  }
  var curTmp = 1;
  function addTmpVar(type) {
    return addVar(type,"#tmp"+(curTmp++));
  }
  function addVar(type,name) {
    return curScope().vars[name] = {
      name:name, type:type,
      loc:"b",
      baseScope:curScope(),
      reads:[], writes:[],
      addOp:function(op,src) {
        src = src || null;
        var c = [op,this,src];
        addCmd(c);
        this.writes.push(c);
        if ((typeof src)=="object")
          src.reads.push(c);
      },
      isReadBetween: function (beg,end) {
        for (var i in this.reads) {
          if ()
            return true;
        }
        return false;
      }
    };
  }
  function getVar(name) {
    for (var i=scopes.length-1; i>=0; i--) {
      var v = scopes[i].vars[name];
      if (v) return v;
    }
    return null;
  }
  function addCmd(c) {
    c.scope = curScope();
    c.toString = function() {
      var str = this[0]+" "+this[1].name;
      if (this[2]!=null) str += ","+("number"==typeof this[2]?this[2]:this[2].name);
      return str;
    }
    cmds.push(c);
  }
  function rmCmd(c) {
    arrRm(cmds,c);
    arrRm(c[1].writes,c);
    if ("object"==typeof c[2])
      arrRm(c[2].reads,c);
    //console.log("Removed: "+c);
  }
  
  var cmds = [];
  
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
    function codeExpr(expr) {
      var t=expr[0],v=expr[1];
      if (t=="num") {
        return v;
      } else if (t=="var") {
        return v;
      } else if (t=="add") {
        var resVar = addTmpVar("byte");
        for (var i in v) {
          var add = v[i][0];
          var val = codeExpr(v[i][1]);
          if (i==0) {
            resVar.addOp("ld",val);
            if (!add) resVar.addOp("neg");
          } else {
            resVar.addOp(add?"add":"sub",val);
          }
        }
        return resVar;
      } else if (t=="mul") {
        var resVar = addTmpVar("byte");
        for (var i in v) {
          var val = codeExpr(v[i]);
          if (i==0) {
            resVar.addOp("ld",val);
          } else {
            resVar.addOp("mul",val);
          }
        }
        return resVar;
      }
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
            var dst = addVar(t1.word,t2.word);
            var src = codeExpr(parseExpr());
            dst.addOp("ld",src);
            assertChar(";");
          } else badTok(t3);
        } else badTok(t3);
      } else badTok(t2);
    } else if (t1.str) badTok(t1);
  }
  popScope();
  
  // output cmds as qxzASM code
  var output = "//BEGIN//\n\n";
  for (var i in cmds) {
    var c = cmds[i];
    output += c+"\n";
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

function arrRm(arr,val) {
  arr.splice(arr.indexOf(val),1);
}



module.exports = {
  compile: compile
};
