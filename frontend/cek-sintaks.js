const ts=require("typescript");
const fs=require("fs");
const f=process.argv[2];
const src=fs.readFileSync(f,"utf8");
const sf=ts.createSourceFile(f,src,ts.ScriptTarget.ES2020,true,ts.ScriptKind.TSX);
const ds=sf.parseDiagnostics||[];
ds.forEach(d=>{const p=sf.getLineAndCharacterOfPosition(d.start);console.log('L'+(p.line+1)+':'+(p.character+1)+' '+ts.flattenDiagnosticMessageText(d.messageText,'\n'))});
console.log('errors='+ds.length);
