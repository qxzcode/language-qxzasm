# language-qxzasm

An Atom package for qxzASM syntax highlighting & code completion.

### What is qxzASM?

I created qxzASM to allow easy programming of calculator assembly programs on-the-go. It's a simple assembly language that compiles into Z80 machine code, geared towards the TI-83 & -84 family of graphing calculators. The assembler is written in JavaScript, allowing code to be compiled using any device with a web browser. The assembler outputs the machine code in hexadecimal, suitable for typing directly into an `AsmPrgm` on the calculator.

You can try out the assembler [on my GitHub Pages site](http://qxzcode.github.io/tiasm/).

### Features of this Atom package
 - Syntax highlighting for qxzASM (`*.qasm`) and hexadecimal assembler output (`*.qasm_a`)
 - Code completion for
  - assembly commands
  - labels
  - system and user-defined constants
 - Assemble code within Atom
  - Just click `Packages -> qxzASM -> Assemble qxzASM`; the output opens in a new editor
