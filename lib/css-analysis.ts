import postcss from 'postcss';
import * as csstree from 'css-tree';

export type CssAnalysis = { variables: Record<string,string>; colors: Array<{value:string;count:number}>; mediaQueries:string[]; fontFamilies:string[]; animationNames:string[]; warnings:string[] };

function colorLiterals(value:string) {
  return value.match(/#[\da-f]{3,8}\b|rgba?\([^)]{3,80}\)|hsla?\([^)]{3,80}\)/gi) ?? [];
}

/** Parse readable CSS with PostCSS and validate/walk its AST with CSS Tree.
 * Cross-origin stylesheets remain inaccessible by design and are never fetched blindly.
 */
export function analyzeCssSources(sources:string[]):CssAnalysis {
  const variables:Record<string,string>={};
  const colorCounts=new Map<string,number>();
  const mediaQueries:string[]=[];
  const fontFamilies:string[]=[];
  const animationNames:string[]=[];
  const warnings:string[]=[];
  for(const source of sources.slice(0,50)) {
    if(!source||source.length>80_000)continue;
    try {
      const root=postcss.parse(source,{from:undefined});
      root.walkDecls(decl=>{
        const property=decl.prop.toLowerCase();
        if(property.startsWith('--') && variables[property]===undefined)variables[property]=decl.value.trim().slice(0,500);
        if(/^(color|background|background-color|border(?:-.+)?-color|outline-color|fill|stroke|text-decoration-color)$/i.test(property)) {
          for(const literal of colorLiterals(decl.value))colorCounts.set(literal,(colorCounts.get(literal)||0)+1);
        }
        if(property==='font-family')fontFamilies.push(decl.value.trim().slice(0,200));
        if(property==='animation-name'||property==='animation') {
          for(const name of decl.value.split(/[\s,]+/)) if(name && !['none','infinite','ease','linear','normal','forwards','both','running'].includes(name.toLowerCase())&&!/^\d/.test(name))animationNames.push(name.slice(0,100));
        }
      });
      root.walkAtRules('media',rule=>{mediaQueries.push(rule.params.slice(0,220));});
    } catch (error) {
      warnings.push(`PostCSS could not parse one stylesheet (${error instanceof Error?error.message:'parse error'}); that source was skipped.`);
    }
    try {
      const ast=csstree.parse(source,{positions:false,parseValue:true,parseCustomProperty:true});
      csstree.walk(ast,(node:any)=>{
        if(node.type==='Atrule' && String(node.name).toLowerCase()==='media' && node.prelude) {
          const query=csstree.generate(node.prelude).slice(0,220);
          if(query&&!mediaQueries.includes(query))mediaQueries.push(query);
        }
        if(node.type==='Declaration') {
          const property=String(node.property||'').toLowerCase();
          if(property.startsWith('--')&&variables[property]===undefined&&node.value)variables[property]=csstree.generate(node.value).slice(0,500);
        }
      });
    } catch {
      // The PostCSS parse is still useful; CSS Tree may reject browser-specific syntax.
    }
  }
  return {variables,colors:Array.from(colorCounts.entries()).map(([value,count])=>({value,count})),mediaQueries:Array.from(new Set(mediaQueries)).slice(0,80),fontFamilies:Array.from(new Set(fontFamilies)).slice(0,40),animationNames:Array.from(new Set(animationNames)).slice(0,30),warnings:Array.from(new Set(warnings)).slice(0,6)};
}
