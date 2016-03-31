fuzzaldrin = require("fuzzaldrin");
assembler = require("./assembler");
compiler = require("./compiler");

function getCmdCompletions(prefix) {
  var cmds = [{cmd:"bcall",desc:"BCALL macro, used for system calls"},{cmd:"bjump",desc:"BJUMP macro, used for system jumps"},{cmd:"ldir",desc:"load, increment, repeat"},{cmd:"ldi",desc:"load and increment"},{cmd:"cpir",desc:"compare, increment, repeat"},{cmd:"cpi",desc:"compare & increment"},{cmd:"inir",desc:"in, increment, repeat"},{cmd:"ini",desc:"in and increment"},{cmd:"outir",desc:"out, increment, repeat"},{cmd:"outi",desc:"out & increment"},{cmd:"neg",desc:"negate the value in a"},{cmd:"retn",desc:"[retn]"},{cmd:"im",desc:"set interrupt mode"},{cmd:"rrd",desc:"[rrd]"},{cmd:"lddr",desc:"[lddr]"},{cmd:"ldd",desc:"[ldd]"},{cmd:"cpdr",desc:"[cpdr]"},{cmd:"cpd",desc:"[cpd]"},{cmd:"indr",desc:"[indr]"},{cmd:"ind",desc:"[ind]"},{cmd:"outdr",desc:"[outdr]"},{cmd:"outd",desc:"[outd]"},{cmd:"reti",desc:"[reti]"},{cmd:"nop",desc:"\"no operation\" (do nothing)"},{cmd:"ld",desc:"load (assign one value to another)"},{cmd:"inc",desc:"increment by one"},{cmd:"dec",desc:"decrement by one"},{cmd:"exx",desc:"[exx]"},{cmd:"ex",desc:"exchange two values"},{cmd:"djnz",desc:"decrement b & jump if it isn't 0"},{cmd:"jr",desc:"relative jump"},{cmd:"rlca",desc:"[rlca]"},{cmd:"rla",desc:"[rla]"},{cmd:"daa",desc:"decimal adjust accumulator"},{cmd:"scf",desc:"sets the carry flag"},{cmd:"rrca",desc:"[rrca]"},{cmd:"rra",desc:"[rra]"},{cmd:"cpl",desc:"[cpl]"},{cmd:"ccf",desc:"invert the carry flag"},{cmd:"halt",desc:"pause until the next interrupt"},{cmd:"add",desc:"add a value to another"},{cmd:"adc",desc:"add a value to another+[carry flag]"},{cmd:"sub",desc:"subtract a value from another"},{cmd:"sbc",desc:"subtract a value-[carry flag] from another"},{cmd:"and",desc:"bitwise AND with the accumulator"},{cmd:"xor",desc:"bitwise XOR with the accumulator"},{cmd:"or",desc:"bitwise OR with the accumulator"},{cmd:"cp",desc:"compare to the accumulator"},{cmd:"ret",desc:"return from a call"},{cmd:"pop",desc:"pop a value off the stack"},{cmd:"jp",desc:"absolute jump"},{cmd:"call",desc:"call a subroutine"},{cmd:"push",desc:"push a value onto the stack"},{cmd:"rst",desc:"\"reset\" (jump) to an address"},{cmd:"out",desc:"output a value to a port"},{cmd:"in",desc:"read a value from a port"},{cmd:"di",desc:"disable interrupts"},{cmd:"ei",desc:"enable interrupts"},{cmd:"rld",desc:"[rld]"},{cmd:"rlc",desc:"[rlc]"},{cmd:"rrc",desc:"[rrc]"},{cmd:"rl",desc:"[rl]"},{cmd:"rr",desc:"[rr]"},{cmd:"sla",desc:"[sla]"},{cmd:"sra",desc:"[sra]"},{cmd:"sll",desc:"[sll]"},{cmd:"srl",desc:"[srl]"},{cmd:"bit",desc:"read a bit into the z flag"},{cmd:"res",desc:"set a bit to 0"},{cmd:"set",desc:"set a bit to 1"}];
  return fuzzaldrin.filter(cmds,prefix,{maxResults:20,key:"cmd"}).map(function(c) {
    return {text:c.cmd,type:"keyword",rightLabel:"asm instruction",description:c.desc};
  });
}

function getLabelCompletions(prefix, buf) {
  var res = [];
  buf.scan(/(?:^|\n|:)\s*@(\w+)/g, function(o) {
    res.push(o.match[1]);
  });
  res = fuzzaldrin.filter(res,prefix,{maxResults:20}).map(function(l) {
    return {text:l,type:"method",rightLabel:"label"};
  });
  return res;
}

function getConstCompletions(prefix, buf) {
  var builtInConsts = assembler.getDefaultConstants();
  var res = Object.keys(builtInConsts);
  buf.scan(/(?:^|\n|:)\s*\.const\s+(\w+)/g, function(o) {
    res.push(o.match[1]);
  });
  var res = fuzzaldrin.filter(res,prefix,{maxResults:20}).map(function(c) {
    var v = builtInConsts[c];
    return {text:c,type:"constant",rightLabel:"constant",description:v&&"= "+v+" = $"+v.toString(16).toUpperCase(),replacementPrefix:prefix};
  });
  return res;
}

var provider = {
  selector: '.source.qasm',
  disableForSelector: '.source.qasm .comment',
  inclusionPriority: 1,
  excludeLowerPriority: true,
  
  getSuggestions: function(req) {
    var cmd = req.editor.getTextInRange([[req.bufferPosition.row, 0], req.bufferPosition]).split(":");
    cmd = cmd[cmd.length-1].replace(/^\s+/,""); // get the last command and trim whitespace off the beginning
    if (cmd.indexOf(" ")==-1 && cmd!="") {
      return getCmdCompletions(cmd);
    }
    var label = cmd.split("@");
    label = label[label.length-1];
    if (cmd.indexOf("@")>0 && /^\w*$/.test(label)) {
      return getLabelCompletions(label, req.editor);
    }
    var m = /([\w$]+)$/.exec(cmd);
    if (m && !/^(\d+|\$[0-9a-fA-F]+)$/.test(m[1]) && !/\.const\s+\w+$/.test(cmd)) {
      return getConstCompletions(m[1], req.editor);
    }
    return null;
  }
}

function processSource(func,errTitle,resGram) {
  var src = atom.workspace.getActiveTextEditor().getText();
  var res = func(src,function(msg) {
    atom.confirm({message:errTitle,detailedMessage:msg,buttons:["OK"]});
  });
  if (res) {
    atom.workspace.open().then(function(editor){
      editor.setGrammar(atom.grammars.grammarForScopeName(resGram));
      editor.setText(res);
    });
  }
}


module.exports = {
  activate: function() {
    atom.commands.add("atom-text-editor",{
      "language-qxzasm:assemble":function(event) {
        processSource(assembler.assemble,"Assemler error","source.qasm_a");
      },
      "language-qxzasm:compile":function(event) {
        processSource(compiler.compile,"Compiler error","source.qasm");
      },
      "language-qxzasm:compile-assemble":function(event) {
        alert("halllp");
      }
    });
  },
  getProvider: function() {
    return provider;
  }
};
