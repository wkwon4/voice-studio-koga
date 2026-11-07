export const VOICES = ['Zephyr','Puck','Charon','Kore','Fenrir','Leda','Orus','Aoede','Callirrhoe','Autonoe','Enceladus','Iapetus','Umbriel','Algieba','Despina','Erinome','Algenib','Rasalgethi','Laomedeia','Achernar','Alnilam','Schedar','Gacrux','Pulcherrima','Achird','Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager','Sulafat'];
export const MAX_SECTIONS = 500;
export function parseScript(script) {
  if (script.length > 60000) throw Error('Keep scripts under 60,000 characters.');
  const sections=[]; let current=null;
  for (const [i,raw] of script.split(/\r?\n/).entries()) {
    const line=raw.trim(); if(!line) continue;
    const match=line.match(/^([\p{L}\p{N} _.'-]{1,40}?)(?:\s*\[([^\]]{0,300})\])?\s*:\s*(.*)$/u);
    if(match) {current={id:String(sections.length+1),speaker:match[1].trim().toUpperCase(),style:match[2]?.trim()||'',text:match[3].trim()}; sections.push(current);}
    else if(current) current.text+=(current.text?'\n':'')+line;
    else throw Error(`Line ${i+1}: start with SPEAKER [delivery]: dialogue.`);
  }
  if(!sections.length) throw Error('Paste a script first.');
  for(const s of sections) {if(!s.text) throw Error(`${s.speaker} has an empty section.`); if(s.text.length>2500) throw Error(`${s.speaker}: split this section into turns under 2,500 characters.`);}
  if(sections.length>MAX_SECTIONS) throw Error(`Use at most ${MAX_SECTIONS} sections per project.`);
  return sections;
}
