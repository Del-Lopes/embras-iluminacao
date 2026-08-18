// Forma comparável de um rótulo: minúscula, sem acento, sem espaços nas pontas
// e com espaços internos colapsados.
//
// É o que faz "tensao", "Tensão", "TENSAO" e "  Tensão  " serem o MESMO rótulo.
// Vive num módulo próprio porque precisa ser idêntica nos dois lados: o editor
// usa para reconhecer o preset enquanto o usuário digita, e a action usa para
// gravar a coluna `normalized`, que carrega o UNIQUE da tabela. Duas cópias
// divergindo criariam duplicatas que o banco aceitaria sem reclamar.
export const normalizeLabel = (value: string): string =>
  value
    .normalize('NFD')
    // Remove os diacríticos que o NFD separou. Faixa em \u escapado, e não com
    // os caracteres literais (como fazem os slugify do projeto): combining
    // marks são invisíveis no editor e somem numa conversão de encoding
    // descuidada, levando a normalização junto sem erro nenhum.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
