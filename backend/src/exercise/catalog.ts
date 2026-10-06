import { CalcMode } from './calories';

export interface CatalogEntry {
  name: string;
  category: string;
  calcMode: CalcMode;
  met?: number;
}

/**
 * Catálogo embutido. Os valores de MET são aproximações do Compendium of Physical Activities
 * (Ainsworth et al., 2011); caminhada, corrida e ciclismo são calculados pela velocidade.
 * Para um valor diferente, crie uma atividade própria.
 */
export const CATALOG: CatalogEntry[] = [
  // Caminhada e corrida
  { name: 'Caminhada', category: 'Caminhada e corrida', calcMode: 'walk' },
  { name: 'Caminhada na esteira', category: 'Caminhada e corrida', calcMode: 'walk' },
  { name: 'Corrida', category: 'Caminhada e corrida', calcMode: 'run' },
  { name: 'Corrida na esteira', category: 'Caminhada e corrida', calcMode: 'run' },
  { name: 'Trilha / caminhada em terreno irregular', category: 'Caminhada e corrida', calcMode: 'met', met: 6.0 },
  { name: 'Subir escadas (ritmo lento)', category: 'Caminhada e corrida', calcMode: 'met', met: 4.0 },
  { name: 'Subir escadas (ritmo rápido)', category: 'Caminhada e corrida', calcMode: 'met', met: 8.8 },
  // Ciclismo
  { name: 'Ciclismo ao ar livre', category: 'Ciclismo', calcMode: 'cycle' },
  { name: 'Bicicleta ergométrica (leve)', category: 'Ciclismo', calcMode: 'met', met: 4.8 },
  { name: 'Bicicleta ergométrica (moderada)', category: 'Ciclismo', calcMode: 'met', met: 6.8 },
  { name: 'Bicicleta ergométrica (intensa)', category: 'Ciclismo', calcMode: 'met', met: 8.8 },
  // Academia e treino funcional
  { name: 'Musculação (leve a moderada)', category: 'Academia e funcional', calcMode: 'met', met: 3.5 },
  { name: 'Musculação (intensa)', category: 'Academia e funcional', calcMode: 'met', met: 6.0 },
  { name: 'Treino funcional / circuito', category: 'Academia e funcional', calcMode: 'met', met: 8.0 },
  { name: 'CrossFit / treino de alta intensidade', category: 'Academia e funcional', calcMode: 'met', met: 8.0 },
  { name: 'Calistenia (leve a moderada)', category: 'Academia e funcional', calcMode: 'met', met: 3.8 },
  { name: 'Calistenia (intensa)', category: 'Academia e funcional', calcMode: 'met', met: 8.0 },
  { name: 'Pular corda', category: 'Academia e funcional', calcMode: 'met', met: 11.8 },
  { name: 'Elíptico', category: 'Academia e funcional', calcMode: 'met', met: 5.0 },
  { name: 'Remo ergômetro (moderado)', category: 'Academia e funcional', calcMode: 'met', met: 4.8 },
  { name: 'Remo ergômetro (intenso)', category: 'Academia e funcional', calcMode: 'met', met: 8.5 },
  { name: 'Simulador de escada', category: 'Academia e funcional', calcMode: 'met', met: 9.0 },
  // Aulas e dança
  { name: 'Ginástica aeróbica (baixo impacto)', category: 'Aulas e dança', calcMode: 'met', met: 5.0 },
  { name: 'Ginástica aeróbica (alto impacto)', category: 'Aulas e dança', calcMode: 'met', met: 7.3 },
  { name: 'Zumba / dança aeróbica', category: 'Aulas e dança', calcMode: 'met', met: 7.3 },
  { name: 'Dança de salão', category: 'Aulas e dança', calcMode: 'met', met: 4.5 },
  // Natação
  { name: 'Natação (leve a moderada)', category: 'Natação', calcMode: 'met', met: 5.8 },
  { name: 'Natação (intensa)', category: 'Natação', calcMode: 'met', met: 9.8 },
  { name: 'Hidroginástica', category: 'Natação', calcMode: 'met', met: 5.3 },
  // Esportes
  { name: 'Futebol (recreativo)', category: 'Esportes', calcMode: 'met', met: 7.0 },
  { name: 'Futebol (competitivo)', category: 'Esportes', calcMode: 'met', met: 10.0 },
  { name: 'Basquete (jogo)', category: 'Esportes', calcMode: 'met', met: 8.0 },
  { name: 'Vôlei (recreativo)', category: 'Esportes', calcMode: 'met', met: 3.0 },
  { name: 'Vôlei de praia', category: 'Esportes', calcMode: 'met', met: 8.0 },
  { name: 'Handebol', category: 'Esportes', calcMode: 'met', met: 12.0 },
  { name: 'Tênis', category: 'Esportes', calcMode: 'met', met: 7.3 },
  { name: 'Tênis de mesa', category: 'Esportes', calcMode: 'met', met: 4.0 },
  { name: 'Badminton', category: 'Esportes', calcMode: 'met', met: 5.5 },
  { name: 'Squash', category: 'Esportes', calcMode: 'met', met: 12.0 },
  { name: 'Patins', category: 'Esportes', calcMode: 'met', met: 7.0 },
  { name: 'Skate', category: 'Esportes', calcMode: 'met', met: 5.0 },
  // Lutas
  { name: 'Boxe (saco de pancada)', category: 'Lutas', calcMode: 'met', met: 5.5 },
  { name: 'Boxe (sparring)', category: 'Lutas', calcMode: 'met', met: 7.8 },
  { name: 'Jiu-jitsu / judô / karatê / muay thai', category: 'Lutas', calcMode: 'met', met: 10.3 },
  // Mente e corpo
  { name: 'Alongamento', category: 'Mente e corpo', calcMode: 'met', met: 2.3 },
  { name: 'Yoga (hatha)', category: 'Mente e corpo', calcMode: 'met', met: 2.5 },
  { name: 'Yoga (vinyasa / power)', category: 'Mente e corpo', calcMode: 'met', met: 4.0 },
  { name: 'Pilates', category: 'Mente e corpo', calcMode: 'met', met: 3.0 },
  // Dia a dia
  { name: 'Faxina geral', category: 'Dia a dia', calcMode: 'met', met: 3.3 },
  { name: 'Jardinagem', category: 'Dia a dia', calcMode: 'met', met: 3.8 },
  { name: 'Passear com o cachorro', category: 'Dia a dia', calcMode: 'met', met: 3.0 },
];
