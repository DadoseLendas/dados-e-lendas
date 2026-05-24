const fs = require('fs');
const ts = require('typescript');

const sample = `TROLL
Gigante Grande, caótico e mau
Classe de Armadura 15 (armadura natural)
Pontos de Vida 84 (8d10 + 40)
Deslocamento 9 m
FOR
18 (+4)
DES
13 (+1)
CON
20 (+5)
INT
7 (–2)
SAB
9 (–1)
CAR
7 (–2)
Perícias Percepção +1
Sentidos visão no escuro 18 m, Percepção passiva 11
Idiomas Gigante
Nível de Desafio 5 (1.800 XP)
Faro Aguçado. O troll tem vantagem em testes de Sabedoria
(Percepção) relacionados ao olfato.
Regeneração. O troll recupera 10 pontos de vida no início de cada
um dos seus turnos. Se o troll sofrer dano de ácido ou fogo, esse
traço não funcionará até o início do próximo turno do troll. O troll
morre apenas se começar seu turno com 0 pontos de vida e não
puder se regenerar.
AÇÕES
Ataques Múltiplos. O troll realiza três ataques: um com sua
mordida e dois com suas garras.
Mordida. Ataque Corpo-a-Corpo com Arma: +7 para atingir,
alcance 1,5 m, um alvo. Acerto: 7 (1d6 + 4) de dano perfurante.
Garra. Ataque Corpo-a-Corpo com Arma: +7 para atingir, alcance
1,5 m, um alvo. Acerto: 11 (2d6 + 4) de dano cortante.`;

const source = fs.readFileSync('utils/monster-sheet-parser.ts', 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const moduleObject = { exports: {} };
const compiled = new Function('require', 'module', 'exports', transpiled);
compiled(require, moduleObject, moduleObject.exports);

const result = moduleObject.exports.parseMonsterSheetFromClipboardText(sample);
console.log(JSON.stringify(result, null, 2));
