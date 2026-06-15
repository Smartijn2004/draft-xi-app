import type {
  DraftedPlayer, LeagueId, MatchResult, SeasonResult, GroupStanding, GoalEvent, PlayerStat, Position, LeagueTableEntry, Tactic
} from './types'

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function calcTeamRating(players: DraftedPlayer[]): number {
  if (players.length === 0) return 70
  const weights: Record<string, number> = { GK: 0.9, DEF: 1.0, MID: 1.05, FWD: 1.1 }
  const total = players.reduce((s, p) => s + p.rating * (weights[p.position] ?? 1), 0)
  return total / players.length
}

function poissonSample(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do { k++; p *= rng() } while (p > L)
  return k - 1
}

// Weights for picking goal scorers by position
const SCORER_WEIGHTS: Record<Position, number> = {
  GK: 0, DEF: 0.3, MID: 1.5, FWD: 4.0
}
// Weights for picking assist providers by position
const ASSIST_WEIGHTS: Record<Position, number> = {
  GK: 0, DEF: 0.5, MID: 2.5, FWD: 2.0
}

// Real current-era (2023–25) scorers per opponent club/nation, so opponent
// goals are credited to players who actually play there. Falls back to the
// club name itself if a team is ever missing from this map.
const OPP_SQUADS: Record<string, string[]> = {
  // Premier League
  'Manchester City': ['Haaland', 'Foden', 'Marmoush', 'Doku', 'Bernardo Silva', 'Cherki'],
  'Liverpool': ['Salah', 'Isak', 'Wirtz', 'Gakpo', 'Szoboszlai', 'Ekitiké'],
  'Arsenal': ['Saka', 'Ødegaard', 'Gyökeres', 'Martinelli', 'Trossard', 'Eze', 'Merino'],
  'Chelsea': ['Palmer', 'João Pedro', 'Neto', 'Enzo Fernández', 'Garnacho'],
  'Manchester United': ['Bruno Fernandes', 'Šeško', 'Mbeumo', 'Cunha', 'Amad'],
  'Tottenham': ['Richarlison', 'Kudus', 'Johnson', 'Kulusevski', 'Solanke'],
  'Newcastle': ['Gordon', 'Woltemade', 'Barnes', 'Tonali', 'Wissa'],
  'Aston Villa': ['Watkins', 'Rogers', 'McGinn', 'Malen', 'Buendía'],
  'West Ham': ['Bowen', 'Paquetá', 'Füllkrug', 'Summerville', 'Wilson'],
  'Brighton': ['Mitoma', 'Welbeck', 'Rutter', 'Minteh', 'Adingra'],
  'Wolves': ['Strand Larsen', 'Munetsi', 'Bellegarde', 'Arias', 'Hwang'],
  'Everton': ['Ndiaye', 'Beto', 'McNeil', 'Grealish', 'Barry'],
  'Fulham': ['Jiménez', 'Iwobi', 'Muniz', 'Smith Rowe', 'King'],
  'Brentford': ['Igor Thiago', 'Schade', 'Ouattara', 'Damsgaard', 'Janelt'],
  'Crystal Palace': ['Mateta', 'Sarr', 'Muñoz', 'Pino', 'Kamada'],
  'Leicester City': ['Vardy', 'Mavididi', 'El Khannouss', 'Daka', 'Ayew'],
  'Nottm Forest': ['Wood', 'Gibbs-White', 'Hudson-Odoi', 'Awoniyi', 'Ndoye'],
  'Burnley': ['Flemming', 'Foster', 'Edwards', 'Anthony', 'Brun Larsen'],
  'Luton Town': ['Morris', 'Adebayo', 'Clark', 'Doughty', 'Townsend'],
  // La Liga
  'Real Madrid': ['Mbappé', 'Vinícius Júnior', 'Bellingham', 'Rodrygo', 'Güler'],
  'Barcelona': ['Yamal', 'Lewandowski', 'Raphinha', 'Olmo', 'Ferran Torres'],
  'Atletico Madrid': ['Griezmann', 'Álvarez', 'Sørloth', 'Llorente', 'Baena'],
  'Athletic Bilbao': ['Nico Williams', 'Iñaki Williams', 'Sancet', 'Guruzeta', 'Berenguer'],
  'Real Sociedad': ['Oyarzabal', 'Kubo', 'Barrenetxea', 'Óskarsson', 'Brais Méndez'],
  'Villarreal': ['Pépé', 'Mikautadze', 'Moleiro', 'Buchanan', 'Parejo'],
  'Sevilla': ['Lukebakio', 'Romero', 'Vargas', 'Agoumé', 'Ejuke'],
  'Valencia': ['Hugo Duro', 'Diego López', 'Pepelu', 'Danjuma', 'Sadiq'],
  'Betis': ['Isco', 'Antony', 'Lo Celso', 'Fornals', 'Bakambu'],
  'Osasuna': ['Budimir', 'Oroz', 'Moncayola', 'Bryan Zaragoza', 'Rubén García'],
  'Celta Vigo': ['Aspas', 'Borja Iglesias', 'Swedberg', 'Bamba', 'Durán'],
  'Getafe': ['Mayoral', 'Uche', 'Arambarri', 'Milla', 'Liso'],
  'Las Palmas': ['Sandro', 'Munir', 'Viera', 'McBurnie', 'Fuster'],
  'Girona': ['Stuani', 'Tsygankov', 'Vanat', 'Gil', 'Portu'],
  'Mallorca': ['Muriqi', 'Larin', 'Darder', 'Asano', 'Dani Rodríguez'],
  'Rayo Vallecano': ['Camello', 'Isi Palazón', 'De Frutos', 'Embarba', 'Álvaro García'],
  'Alaves': ['Kike García', 'Vicente', 'Guridi', 'Rebbach', 'Boyé'],
  'Cadiz': ['Chris Ramos', 'Sobrino', 'Juanmi', 'Roger Martí', 'Guardiola'],
  'Granada': ['Uzuni', 'Boyé', 'Puertas', 'Pellistri', 'Weissman'],
  // Serie A
  'Inter Milan': ['Lautaro Martínez', 'Thuram', 'Barella', 'Çalhanoğlu', 'Esposito'],
  'AC Milan': ['Leão', 'Pulisic', 'Giménez', 'Modrić', 'Loftus-Cheek'],
  'Juventus': ['Vlahović', 'Yıldız', 'David', 'Openda', 'Conceição'],
  'Napoli': ['Højlund', 'McTominay', 'Lukaku', 'Politano', 'Neres'],
  'Roma': ['Dybala', 'Soulé', 'Dovbyk', 'Pellegrini', 'Ferguson'],
  'Lazio': ['Castellanos', 'Zaccagni', 'Dia', 'Pedro', 'Isaksen'],
  'Atalanta': ['Lookman', 'De Ketelaere', 'Scamacca', 'Pašalić', 'Krstović'],
  'Fiorentina': ['Kean', 'Gudmundsson', 'Piccoli', 'Beltrán', 'Fagioli'],
  'Torino': ['Zapata', 'Vlašić', 'Adams', 'Simeone', 'Ngonge'],
  'Bologna': ['Orsolini', 'Castro', 'Dallinga', 'Odgaard', 'Cambiaghi'],
  'Udinese': ['Davis', 'Zaniolo', 'Bravo', 'Atta', 'Ekkelenkamp'],
  'Sassuolo': ['Berardi', 'Pinamonti', 'Laurienté', 'Thorstvedt', 'Volpato'],
  'Sampdoria': ['Coda', 'Tutino', 'Borini', 'De Luca', 'Henderson'],
  'Empoli': ['Colombo', 'Fazzini', 'Cancellieri', 'Caputo', 'Anjorin'],
  'Hellas Verona': ['Orban', 'Giovane', 'Sarr', 'Suslov', 'Tengstedt'],
  'Lecce': ['Camarda', 'Banda', 'Pierotti', 'Stulić', 'Tete Morente'],
  'Monza': ['Colpani', 'Dany Mota', 'Caprari', 'Đurić', 'Maldini'],
  'Salernitana': ['Candreva', 'Tchaouna', 'Ikwuemesi', 'Botheim', 'Simy'],
  'Cagliari': ['Luvumbo', 'Viola', 'Esposito', 'Felici', 'Borrelli'],
  // Champions League extras
  'Bayern Munich': ['Kane', 'Musiala', 'Olise', 'Gnabry', 'Luis Díaz'],
  'PSG': ['Dembélé', 'Doué', 'Kvaratskhelia', 'Barcola', 'Ramos'],
  'Borussia Dortmund': ['Guirassy', 'Adeyemi', 'Brandt', 'Beier', 'Nmecha'],
  'Ajax': ['Weghorst', 'Berghuis', 'Taylor', 'Godts', 'Klaassen'],
  'Porto': ['Samu', 'Pepê', 'Veiga', 'Borges', 'Eustáquio'],
  'Benfica': ['Pavlidis', 'Aktürkoğlu', 'Aursnes', 'Schjelderup', 'Ríos'],
  // World Cup nations
  'Brazil': ['Vinícius Júnior', 'Raphinha', 'Rodrygo', 'Cunha', 'Estêvão'],
  'Argentina': ['Messi', 'Lautaro Martínez', 'Álvarez', 'Mac Allister', 'De Paul'],
  'France': ['Mbappé', 'Dembélé', 'Thuram', 'Olise', 'Doué'],
  'Germany': ['Wirtz', 'Musiala', 'Havertz', 'Füllkrug', 'Gnabry'],
  'Spain': ['Yamal', 'Olmo', 'Morata', 'Oyarzabal', 'Nico Williams'],
  'England': ['Kane', 'Saka', 'Bellingham', 'Foden', 'Palmer'],
  'Italy': ['Retegui', 'Chiesa', 'Barella', 'Scamacca', 'Raspadori'],
  'Netherlands': ['Depay', 'Gakpo', 'Simons', 'Weghorst', 'Reijnders'],
  'Portugal': ['Ronaldo', 'Bruno Fernandes', 'Leão', 'Ramos', 'Neto'],
  'Croatia': ['Modrić', 'Kramarić', 'Perišić', 'Budimir', 'Pašalić'],
  'Uruguay': ['Núñez', 'Valverde', 'Pellistri', 'Aguirre', 'Olivera'],
  'Belgium': ['De Bruyne', 'Lukaku', 'Doku', 'Trossard', 'Openda'],
  'Colombia': ['Luis Díaz', 'James Rodríguez', 'Durán', 'Córdoba', 'Arias'],
  'Senegal': ['Mané', 'Sarr', 'Jackson', 'Ndiaye', 'Gueye'],
  'Morocco': ['Hakimi', 'Ziyech', 'En-Nesyri', 'Ezzalzouli', 'Rahimi'],
  'USA': ['Pulisic', 'Balogun', 'Weah', 'McKennie', 'Reyna'],
  'Mexico': ['Lozano', 'Giménez', 'Vega', 'Pineda', 'Antuna'],
  // World Cup 2026 nations not covered above (current-form scorers).
  "Türkiye": ["Calhanoglu","Ozcan","Guler","Gul","Yildiz"],
  "Switzerland": ["Xhaka","Embolo","Ndoye","Jashari","Zakaria"],
  "Austria": ["Schlager","Seiwald","Sabitzer","Laimer","Arnautovic"],
  "Japan": ["Ueda","Tanaka","Kubo","Doan","Machino"],
  "Czechia": ["Schick","Soucek","Hlozek","Kuchta","Chory"],
  "Saudi Arabia": ["Feras Albrikan","Salem Aldawsari","Nasser Aldawsari","Saleh Alshehri","Abdullah Alhamddan"],
  "Côte D'Ivoire": ["Kessie","Fofana","Diomande","Bonny","Adingra"],
  "Norway": ["Haaland","Odegaard","Sorloth","Nusa","Ryerson"],
  "Sweden": ["Gyokeres","Isak","Elanga","Bergvall","Nygren"],
  "Canada": ["David","Eustaquio","Choiniere","Larin","Buchanan"],
  "Scotland": ["Scott","John","Adams","Fletcher","Christie"],
  "Algeria": ["Mahrez","Hadj Moussa","Gouiri","Maza","Aouar"],
  "Korea Republic": ["Son","Hwang","Lee","Cho","Bae"],
  "Ecuador": ["Caicedo","Rodriguez","Plata","Yeboah","Paez"],
  "Qatar": ["Akram Afif","Almoez Ali","Ahmed Alaaeldin","Hassan Alhaydos","Abdulaziz Hatem"],
  "Egypt": ["Mohamed Salah","Omar Marmoush","Trezeguet","Hamza Abdelkarim","Emam Ashour"],
  "South Africa": ["Mokoena","Appollis","Mbatha","Moremi","Foster"],
  "Ghana": ["Semenyo","Partey","Ayew","Fatawu","Sulemana"],
  "Paraguay": ["Sosa","Mauricio","Gomez","Sanabria","Cubas"],
  "Congo DR": ["Wissa","Bakambu","Mukau","Mbuku","Elia"],
  "Australia": ["Metcalfe","Mabil","Oneill","Hrustic","Irankunda"],
  "Curaçao": ["Bacuna","Roemeratoe","Antonisse","Hansen","Bemba"],
  "Bosnia And Herzegovina": ["Bajraktarevic","Demirovic","Tabakovic","Dzeko","Hadziahmetovic"],
  "Haiti": ["Bellegarde","Isidor","Pierrot","Deedson","Nazon"],
  "Tunisia": ["Ayari","Skhiri","Saad","Mejbri","Slimane"],
  "Panama": ["Carrasquilla","Diaz","Rodriguez","Barcenas","Fajardo"],
  "Cabo Verde": ["Jovane Cabral","Jamiro Monteiro","Dailon Livramento","Ryan Mendes","Yannick Semedo"],
  "IR Iran": ["Taremi","Ghoddos","Jahanbakhsh","Moghanloo","Alipour"],
  "New Zealand": ["Wood","Waine","Just","Old","Stamenic"],
  "Iraq": ["Ali Alhamadi","Zidane Iqbal","Ali Jasim","Marko Farji","Mohanad Ali"],
  "Uzbekistan": ["Shomurodov","Fayzullaev","Xamrobekov","Masharipov","Urunov"],
  "Jordan": ["Mousa Altamari","Ali Olwan","Mohammad Abuzraiq","Nizar Alrashdan","Noor Alrawabdeh"],
  // Legends League — iconic scorers per legendary XI.
  'Real Madrid Galácticos': ['Ronaldo', 'Zidane', 'Figo', 'Raúl'],
  'Barcelona Tiki-Taka': ['Messi', 'Eto\'o', 'Henry', 'Xavi'],
  'Brazil 1970': ['Pelé', 'Jairzinho', 'Tostão', 'Rivelino'],
  'Real Madrid 2017': ['Ronaldo', 'Benzema', 'Bale', 'Modrić'],
  'Brazil 2002': ['Ronaldo', 'Rivaldo', 'Ronaldinho', 'Roberto Carlos'],
  'AC Milan Immortals': ['Van Basten', 'Gullit', 'Weah', 'Shevchenko'],
  'Bayern 2013': ['Robben', 'Ribéry', 'Müller', 'Mandžukić'],
  'Man City Centurions': ['Agüero', 'Sterling', 'Sané', 'Jesus'],
  'Man Utd Treble': ['Yorke', 'Cole', 'Sheringham', 'Solskjær'],
  'Spain 2010': ['Villa', 'Iniesta', 'Torres', 'Xavi'],
  'Argentina 1986': ['Maradona', 'Valdano', 'Burruchaga'],
  'France 1998': ['Zidane', 'Henry', 'Trezeguet', 'Djorkaeff'],
  'Liverpool 2019': ['Salah', 'Mané', 'Firmino', 'Origi'],
  'Arsenal Invincibles': ['Henry', 'Bergkamp', 'Pirès', 'Ljungberg'],
  'Germany 2014': ['Müller', 'Klose', 'Kroos', 'Götze'],
  'Inter Grande': ['Milito', 'Eto\'o', 'Sneijder', 'Pandev'],
  'Ajax 1995': ['Kluivert', 'Litmanen', 'Overmars', 'Finidi'],
  'Juventus 1996': ['Del Piero', 'Vialli', 'Ravanelli'],
  'Netherlands 1974': ['Cruyff', 'Neeskens', 'Rep'],
}

function pickScorer(
  players: DraftedPlayer[],
  weights: Record<Position, number>,
  rng: () => number,
  exclude?: string
): string {
  const eligible = players.filter(p => p.name !== exclude && weights[p.position as Position] > 0)
  if (eligible.length === 0) return players[0]?.name ?? 'Unknown'
  // Weight by position AND rating above a 75 baseline, so a 95-rated striker
  // clearly out-scores an 82-rated one in the same role and a recognisable
  // Golden Boot race emerges instead of an even split across the front line.
  const wOf = (p: DraftedPlayer) =>
    weights[p.position as Position] * (1 + Math.max(0, p.rating - 75) / 12)
  const totalW = eligible.reduce((s, p) => s + wOf(p), 0)
  if (totalW === 0) return eligible[Math.floor(rng() * eligible.length)].name
  let r = rng() * totalW
  for (const p of eligible) {
    r -= wOf(p)
    if (r <= 0) return p.name
  }
  return eligible[eligible.length - 1].name
}

function generateMyGoalEvents(
  count: number,
  players: DraftedPlayer[],
  rng: () => number
): GoalEvent[] {
  const events: GoalEvent[] = []
  for (let i = 0; i < count; i++) {
    const minute = Math.floor(90 * rng()) + 1
    const scorer = pickScorer(players, SCORER_WEIGHTS, rng)
    const assist = rng() < 0.72
      ? pickScorer(players, ASSIST_WEIGHTS, rng, scorer)
      : undefined
    events.push({ minute, scorer, assist })
  }
  return events.sort((a, b) => a.minute - b.minute)
}

function generateOppGoalEvents(count: number, rng: () => number, oppName?: string): GoalEvent[] {
  const pool = oppName ? OPP_SQUADS[oppName] : undefined
  const events: GoalEvent[] = []
  for (let i = 0; i < count; i++) {
    const minute = Math.floor(90 * rng()) + 1
    const scorer = pool
      ? pool[Math.floor(rng() * pool.length)]
      : oppName ?? 'Goal'
    events.push({ minute, scorer })
  }
  return events.sort((a, b) => a.minute - b.minute)
}

// The player's team gets a small tactical advantage over the AI opponents.
const PLAYER_ADVANTAGE = 3

function simulateMatch(
  myRating: number,
  oppRating: number,
  rng: () => number,
  players?: DraftedPlayer[],
  oppName?: string,
  tactic: Tactic = 'balanced'
): { result: 'W' | 'D' | 'L'; myGoals: number; oppGoals: number; scorers: GoalEvent[]; opponentScorers: GoalEvent[] } {
  const effectiveRating = myRating + PLAYER_ADVANTAGE
  const diff = (effectiveRating - oppRating) / 9
  const rawWin = 1 / (1 + Math.exp(-diff))
  // Higher draw rate, especially in close games, so a dominant side grinds out
  // level results against rivals instead of slipping to defeat — the realistic
  // pattern of an unbeaten season (e.g. Arsenal 03-04: 26W-12D-0L).
  const draw = Math.max(0.11, 0.28 - Math.abs(diff) * 0.04)
  let win = Math.max(0.05, rawWin * (1 - draw))
  let drawP = draw
  let loss = Math.max(0, 1 - win - drawP)

  // Tactics re-shape the W/D/L split. Defensive "parks the bus": losses are
  // nearly halved and bleed into draws — the unbeaten-chaser's tool, at the
  // cost of fewer goals. Attacking trades safety for goals and risk.
  if (tactic === 'defensive') {
    // Park the bus: nearly half your losses become draws — but the cautious
    // setup also bleeds some would-be wins into draws. Safe, fewer defeats,
    // fewer points against weaker sides. The unbeaten-chaser's tool, not the
    // title-grabber's.
    const savedLoss = loss * 0.45
    const shavedWin = win * 0.12
    loss -= savedLoss
    win -= shavedWin
    drawP += savedLoss + shavedWin
  } else if (tactic === 'attacking') {
    // Go for the throat: draws collapse into decisive results, split by how
    // strong you are. More wins AND more losses than balanced — high variance.
    // Great when you must win, dangerous for an unbeaten run.
    const fromDraw = drawP * 0.45
    const winShare = win / (win + loss || 1)
    win += fromDraw * winShare
    loss += fromDraw * (1 - winShare)
    drawP -= fromDraw
  }

  const r = rng()
  let result: 'W' | 'D' | 'L'
  if (r < win) result = 'W'
  else if (r < win + drawP) result = 'D'
  else result = 'L'

  // Goal expectancy. Base ~0.95 per side widens with the rating gap; attack
  // scales faster (/15) than the opponent's defensive suppression (/19). After
  // the win/draw/loss reconciliation below, a dominant XI averages ~2.3 goals
  // and racks up ~85–95 across a 38-game season, while mid-table sides land
  // around 50–60 — realistic top-flight numbers.
  const myMul = tactic === 'attacking' ? 1.22 : tactic === 'defensive' ? 0.82 : 1
  const oppMul = tactic === 'attacking' ? 1.28 : tactic === 'defensive' ? 0.72 : 1
  const effectiveDiff = effectiveRating - oppRating
  const λMy = (0.95 + effectiveDiff / 15) * myMul
  const λOpp = (0.95 - effectiveDiff / 19) * oppMul
  let myGoals = poissonSample(Math.max(0.2, λMy), rng)
  let oppGoals = poissonSample(Math.max(0.18, λOpp), rng)

  // Reconcile goals with result
  if (result === 'W' && myGoals <= oppGoals) {
    myGoals = oppGoals + 1
  } else if (result === 'D') {
    const g = Math.max(myGoals, oppGoals)
    myGoals = g; oppGoals = g
  } else if (result === 'L' && myGoals >= oppGoals) {
    oppGoals = myGoals + 1
  }

  const scorers = players
    ? generateMyGoalEvents(myGoals, players, rng)
    : Array.from({ length: myGoals }, (_, i) => ({ minute: Math.floor(90 * rng()) + 1, scorer: 'Goal' }))
  const opponentScorers = generateOppGoalEvents(oppGoals, rng, oppName)

  return { result, myGoals, oppGoals, scorers, opponentScorers }
}

// ─── League opponents ────────────────────────────────────────────────────────

const PL_OPPONENTS = [
  { name: 'Manchester City', rating: 92 },
  { name: 'Liverpool', rating: 91 },
  { name: 'Arsenal', rating: 89 },
  { name: 'Chelsea', rating: 87 },
  { name: 'Manchester United', rating: 85 },
  { name: 'Tottenham', rating: 84 },
  { name: 'Newcastle', rating: 82 },
  { name: 'Aston Villa', rating: 81 },
  { name: 'West Ham', rating: 79 },
  { name: 'Brighton', rating: 78 },
  { name: 'Wolves', rating: 77 },
  { name: 'Everton', rating: 76 },
  { name: 'Fulham', rating: 75 },
  { name: 'Brentford', rating: 74 },
  { name: 'Crystal Palace', rating: 73 },
  { name: 'Leicester City', rating: 72 },
  { name: 'Nottm Forest', rating: 71 },
  { name: 'Burnley', rating: 70 },
  { name: 'Luton Town', rating: 69 },
]

const LALIGA_OPPONENTS = [
  { name: 'Real Madrid', rating: 94 },
  { name: 'Barcelona', rating: 92 },
  { name: 'Atletico Madrid', rating: 88 },
  { name: 'Athletic Bilbao', rating: 82 },
  { name: 'Real Sociedad', rating: 81 },
  { name: 'Villarreal', rating: 80 },
  { name: 'Sevilla', rating: 79 },
  { name: 'Valencia', rating: 78 },
  { name: 'Betis', rating: 77 },
  { name: 'Osasuna', rating: 74 },
  { name: 'Celta Vigo', rating: 73 },
  { name: 'Getafe', rating: 72 },
  { name: 'Las Palmas', rating: 71 },
  { name: 'Girona', rating: 76 },
  { name: 'Mallorca', rating: 70 },
  { name: 'Rayo Vallecano', rating: 70 },
  { name: 'Alaves', rating: 69 },
  { name: 'Cadiz', rating: 68 },
  { name: 'Granada', rating: 67 },
]

const SERIEA_OPPONENTS = [
  { name: 'Inter Milan', rating: 90 },
  { name: 'AC Milan', rating: 88 },
  { name: 'Juventus', rating: 89 },
  { name: 'Napoli', rating: 87 },
  { name: 'Roma', rating: 83 },
  { name: 'Lazio', rating: 82 },
  { name: 'Atalanta', rating: 84 },
  { name: 'Fiorentina', rating: 79 },
  { name: 'Torino', rating: 76 },
  { name: 'Bologna', rating: 77 },
  { name: 'Udinese', rating: 74 },
  { name: 'Sassuolo', rating: 73 },
  { name: 'Sampdoria', rating: 72 },
  { name: 'Empoli', rating: 71 },
  { name: 'Hellas Verona', rating: 70 },
  { name: 'Lecce', rating: 69 },
  { name: 'Monza', rating: 74 },
  { name: 'Salernitana', rating: 67 },
  { name: 'Cagliari', rating: 68 },
]

const UCL_OPPONENTS = [
  { name: 'Bayern Munich', rating: 93 },
  { name: 'PSG', rating: 90 },
  { name: 'Real Madrid', rating: 94 },
  { name: 'Barcelona', rating: 91 },
  { name: 'Manchester City', rating: 92 },
  { name: 'Liverpool', rating: 90 },
  { name: 'Chelsea', rating: 87 },
  { name: 'AC Milan', rating: 88 },
  { name: 'Inter Milan', rating: 89 },
  { name: 'Juventus', rating: 87 },
  { name: 'Atletico Madrid', rating: 87 },
  { name: 'Borussia Dortmund', rating: 86 },
  { name: 'Ajax', rating: 84 },
  { name: 'Porto', rating: 83 },
  { name: 'Benfica', rating: 82 },
  { name: 'Napoli', rating: 86 },
]

const WC_OPPONENTS = [
  { name: 'Brazil', rating: 92 },
  { name: 'Argentina', rating: 93 },
  { name: 'France', rating: 91 },
  { name: 'Germany', rating: 90 },
  { name: 'Spain', rating: 89 },
  { name: 'England', rating: 87 },
  { name: 'Italy', rating: 86 },
  { name: 'Netherlands', rating: 86 },
  { name: 'Portugal', rating: 88 },
  { name: 'Croatia', rating: 84 },
  { name: 'Uruguay', rating: 83 },
  { name: 'Belgium', rating: 85 },
  { name: 'Colombia', rating: 82 },
  { name: 'Senegal', rating: 81 },
  { name: 'Morocco', rating: 82 },
]

// Legendary XIs — the Beat-the-Legend boss season. Brutally rated; you draft
// from every era to stand a chance.
const LEGENDS_OPPONENTS = [
  { name: 'Real Madrid Galácticos', rating: 95 },
  { name: 'Barcelona Tiki-Taka', rating: 95 },
  { name: 'Brazil 1970', rating: 94 },
  { name: 'Real Madrid 2017', rating: 94 },
  { name: 'Brazil 2002', rating: 93 },
  { name: 'AC Milan Immortals', rating: 93 },
  { name: 'Bayern 2013', rating: 93 },
  { name: 'Man City Centurions', rating: 92 },
  { name: 'Man Utd Treble', rating: 92 },
  { name: 'Spain 2010', rating: 92 },
  { name: 'Argentina 1986', rating: 92 },
  { name: 'France 1998', rating: 91 },
  { name: 'Liverpool 2019', rating: 91 },
  { name: 'Arsenal Invincibles', rating: 91 },
  { name: 'Germany 2014', rating: 91 },
  { name: 'Inter Grande', rating: 90 },
  { name: 'Ajax 1995', rating: 90 },
  { name: 'Juventus 1996', rating: 90 },
  { name: 'Netherlands 1974', rating: 90 },
]

// All 48 World Cup 2026 nations, strongest → weakest. Order defines the
// difficulty pools (top 16 / top 32 / all 48) and seeds the group draw + bracket.
export const WC2026_NATIONS = [
  { name: 'Spain', rating: 89 }, { name: 'France', rating: 89 }, { name: 'England', rating: 89 }, { name: 'Portugal', rating: 89 },
  { name: 'Germany', rating: 88 }, { name: 'Argentina', rating: 88 }, { name: 'Netherlands', rating: 88 }, { name: 'Brazil', rating: 87 },
  { name: 'Belgium', rating: 86 }, { name: 'Uruguay', rating: 85 }, { name: 'Türkiye', rating: 85 }, { name: 'Croatia', rating: 85 },
  { name: 'USA', rating: 85 }, { name: 'Switzerland', rating: 85 }, { name: 'Austria', rating: 84 }, { name: 'Senegal', rating: 84 },
  { name: 'Japan', rating: 84 }, { name: 'Morocco', rating: 84 }, { name: 'Czechia', rating: 83 }, { name: 'Saudi Arabia', rating: 81 },
  { name: "Côte D'Ivoire", rating: 84 }, { name: 'Norway', rating: 84 }, { name: 'Sweden', rating: 83 }, { name: 'Colombia', rating: 83 },
  { name: 'Canada', rating: 83 }, { name: 'Scotland', rating: 83 }, { name: 'Algeria', rating: 83 }, { name: 'Korea Republic', rating: 83 },
  { name: 'Ecuador', rating: 83 }, { name: 'Mexico', rating: 82 }, { name: 'Qatar', rating: 77 }, { name: 'Egypt', rating: 82 },
  { name: 'South Africa', rating: 80 }, { name: 'Ghana', rating: 82 }, { name: 'Paraguay', rating: 81 }, { name: 'Congo DR', rating: 81 },
  { name: 'Australia', rating: 81 }, { name: 'Curaçao', rating: 75 }, { name: 'Bosnia And Herzegovina', rating: 80 }, { name: 'Haiti', rating: 80 },
  { name: 'Tunisia', rating: 80 }, { name: 'Panama', rating: 79 }, { name: 'Cabo Verde', rating: 79 }, { name: 'IR Iran', rating: 79 },
  { name: 'New Zealand', rating: 78 }, { name: 'Iraq', rating: 77 }, { name: 'Uzbekistan', rating: 77 }, { name: 'Jordan', rating: 77 },
]

// The actual FIFA World Cup 2026 final-draw groups (A–L). Playoff slots are
// resolved to the qualified nation in our squad data.
export const WC2026_GROUPS: Record<string, string[]> = {
  A: ['Mexico', 'Korea Republic', 'South Africa', 'Czechia'],
  B: ['Canada', 'Switzerland', 'Qatar', 'Bosnia And Herzegovina'],
  C: ['Brazil', 'Morocco', 'Scotland', 'Haiti'],
  D: ['USA', 'Australia', 'Paraguay', 'Türkiye'],
  E: ['Germany', 'Ecuador', "Côte D'Ivoire", 'Curaçao'],
  F: ['Netherlands', 'Japan', 'Tunisia', 'Sweden'],
  G: ['Belgium', 'IR Iran', 'Egypt', 'New Zealand'],
  H: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cabo Verde'],
  I: ['France', 'Senegal', 'Norway', 'Iraq'],
  J: ['Argentina', 'Austria', 'Algeria', 'Jordan'],
  K: ['Portugal', 'Colombia', 'Uzbekistan', 'Congo DR'],
  L: ['England', 'Croatia', 'Panama', 'Ghana'],
}

const WC2026_RATING = new Map(WC2026_NATIONS.map(n => [n.name, n.rating]))

function getLeagueOpponents(league: LeagueId) {
  if (league === 'laliga') return LALIGA_OPPONENTS
  if (league === 'seriea') return SERIEA_OPPONENTS
  if (league === 'legends') return LEGENDS_OPPONENTS
  return PL_OPPONENTS
}

function shuffleOpponents<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

function buildStats(matches: MatchResult[]): { topScorers: PlayerStat[]; playerOfSeason: PlayerStat | null } {
  const map = new Map<string, PlayerStat>()
  for (const m of matches) {
    for (const e of m.scorers) {
      const s = map.get(e.scorer) ?? { name: e.scorer, goals: 0, assists: 0 }
      s.goals++
      map.set(e.scorer, s)
      if (e.assist) {
        const a = map.get(e.assist) ?? { name: e.assist, goals: 0, assists: 0 }
        a.assists++
        map.set(e.assist, a)
      }
    }
  }
  const topScorers = [...map.values()]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 5)
  return { topScorers, playerOfSeason: topScorers[0] ?? null }
}

function getAchievements(
  won: number, drawn: number, lost: number,
  goalsFor: number, goalsAgainst: number,
  trophyWon: boolean, leagueId: LeagueId,
  position?: number
): string[] {
  const achievements: string[] = []
  if (leagueId === 'pl' || leagueId === 'laliga' || leagueId === 'seriea' || leagueId === 'legends') {
    if (won === 38 && drawn === 0) achievements.push('PERFECT SEASON')
    else if (lost === 0) achievements.push('INVINCIBLE')
    if (trophyWon) achievements.push('CHAMPIONS')
    else if (position !== undefined && position <= 4) achievements.push('TOP 4')
    if (goalsFor >= 100) achievements.push('100 GOALS')
    if (goalsAgainst <= 20) achievements.push('FORTRESS DEFENCE')
    if (won * 3 + drawn < 30) achievements.push('RELEGATION BATTLE')
  } else {
    if (trophyWon && lost === 0 && drawn === 0) achievements.push('PERFECT RUN')
    if (trophyWon) achievements.push('TROPHY WINNERS')
    else if (lost === 0) achievements.push('UNBEATEN')
  }
  return achievements
}

function simulateMatchWithScore(
  ratingA: number, ratingB: number, rng: () => number
): { result: 'W' | 'D' | 'L'; goalsA: number; goalsB: number } {
  const diff = (ratingA - ratingB) / 9
  const rawWin = 1 / (1 + Math.exp(-diff))
  // Matches the player's model so the AI title race stays balanced.
  const draw = Math.max(0.11, 0.28 - Math.abs(diff) * 0.04)
  const win = Math.max(0.05, rawWin * (1 - draw))
  const r = rng()
  const result: 'W' | 'D' | 'L' = r < win ? 'W' : r < win + draw ? 'D' : 'L'
  let goalsA = poissonSample(Math.max(0.2, 0.95 + (ratingA - ratingB) / 15), rng)
  let goalsB = poissonSample(Math.max(0.18, 0.95 - (ratingA - ratingB) / 19), rng)
  if (result === 'W' && goalsA <= goalsB) goalsA = goalsB + 1
  else if (result === 'D') { const g = Math.max(goalsA, goalsB); goalsA = g; goalsB = g }
  else if (result === 'L' && goalsA >= goalsB) goalsB = goalsA + 1
  return { result, goalsA, goalsB }
}

function buildLeagueTable(
  playerMatches: MatchResult[],
  opponents: { name: string; rating: number }[],
  rng: () => number
): LeagueTableEntry[] {
  type Row = { team: string; isPlayer: boolean; played: number; won: number; drawn: number; lost: number; gf: number; ga: number }
  const rows = new Map<string, Row>()
  rows.set('Your XI', { team: 'Your XI', isPlayer: true, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })
  for (const opp of opponents) {
    rows.set(opp.name, { team: opp.name, isPlayer: false, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })
  }

  // Apply player's match results
  for (const m of playerMatches) {
    const pr = rows.get('Your XI')!
    const or = rows.get(m.opponent)
    if (!or) continue
    pr.played++; or.played++
    pr.gf += m.myGoals; pr.ga += m.oppGoals
    or.gf += m.oppGoals; or.ga += m.myGoals
    if (m.result === 'W') { pr.won++; or.lost++ }
    else if (m.result === 'D') { pr.drawn++; or.drawn++ }
    else { pr.lost++; or.won++ }
  }

  // Simulate all opponent H2H fixtures (home + away)
  for (let i = 0; i < opponents.length; i++) {
    for (let j = i + 1; j < opponents.length; j++) {
      const a = opponents[i]; const b = opponents[j]
      const rA = rows.get(a.name)!; const rB = rows.get(b.name)!
      // A hosts B
      const g1 = simulateMatchWithScore(a.rating + 2, b.rating - 2, rng)
      rA.played++; rB.played++
      rA.gf += g1.goalsA; rA.ga += g1.goalsB
      rB.gf += g1.goalsB; rB.ga += g1.goalsA
      if (g1.result === 'W') { rA.won++; rB.lost++ }
      else if (g1.result === 'D') { rA.drawn++; rB.drawn++ }
      else { rA.lost++; rB.won++ }
      // B hosts A
      const g2 = simulateMatchWithScore(b.rating + 2, a.rating - 2, rng)
      rB.played++; rA.played++
      rB.gf += g2.goalsA; rB.ga += g2.goalsB
      rA.gf += g2.goalsB; rA.ga += g2.goalsA
      if (g2.result === 'W') { rB.won++; rA.lost++ }
      else if (g2.result === 'D') { rB.drawn++; rA.drawn++ }
      else { rB.lost++; rA.won++ }
    }
  }

  return [...rows.values()]
    .map(r => ({ ...r, points: r.won * 3 + r.drawn }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return (b.gf - b.ga) - (a.gf - a.ga)
    })
    .map((r, i) => ({ ...r, position: i + 1 }))
}

// ─── Simulation functions ──────────────────────────────────────────────────

export function simulateLeagueSeason(
  players: DraftedPlayer[],
  league: LeagueId,
  seed?: number,
  tactic: Tactic = 'balanced'
): SeasonResult {
  const rng = seededRandom(seed ?? Math.floor(Math.random() * 1e9))
  const teamRating = calcTeamRating(players)
  const opponents = [...getLeagueOpponents(league)]

  const fixtures: { name: string; rating: number; isHome: boolean }[] = []
  opponents.forEach(opp => {
    fixtures.push({ ...opp, isHome: true })
    fixtures.push({ ...opp, isHome: false })
  })
  for (let i = fixtures.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [fixtures[i], fixtures[j]] = [fixtures[j], fixtures[i]]
  }

  const matches: MatchResult[] = fixtures.map(f => {
    const homeBonus = f.isHome ? 2 : -2
    const { result, myGoals, oppGoals, scorers, opponentScorers } =
      simulateMatch(teamRating + homeBonus, f.rating, rng, players, f.name, tactic)
    return {
      opponent: f.name,
      opponentRating: f.rating,
      result,
      myGoals,
      oppGoals,
      scorers,
      opponentScorers,
      round: f.isHome ? 'H' : 'A',
    }
  })

  const won = matches.filter(m => m.result === 'W').length
  const drawn = matches.filter(m => m.result === 'D').length
  const lost = matches.filter(m => m.result === 'L').length
  const gf = matches.reduce((s, m) => s + m.myGoals, 0)
  const ga = matches.reduce((s, m) => s + m.oppGoals, 0)
  const pts = won * 3 + drawn

  const leagueTable = buildLeagueTable(matches, opponents, rng)
  const playerPosition = leagueTable.find(e => e.isPlayer)?.position ?? leagueTable.length
  const trophyWon = playerPosition === 1

  const { topScorers, playerOfSeason } = buildStats(matches)
  const achievements = getAchievements(won, drawn, lost, gf, ga, trophyWon, league, playerPosition)

  return {
    matches, points: pts, won, drawn, lost,
    goalsFor: gf, goalsAgainst: ga,
    isPerfect: lost === 0 && drawn === 0,
    eliminated: false,
    trophyWon,
    teamRating,
    finalPosition: playerPosition,
    topScorers,
    playerOfSeason,
    achievements,
    leagueTable,
  }
}

function groupSimulate(
  teamRating: number,
  groupOpps: { name: string; rating: number }[],
  rng: () => number,
  matchLabelPrefix: string,
  players: DraftedPlayer[],
  tactic: Tactic = 'balanced'
): { matches: MatchResult[]; standings: GroupStanding[]; advanced: boolean } {
  const standings: GroupStanding[] = [
    { team: 'Your XI', rating: teamRating, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, isPlayer: true },
    ...groupOpps.map(o => ({ team: o.name, rating: o.rating, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, isPlayer: false }))
  ]

  const matches: MatchResult[] = []

  groupOpps.forEach((opp, idx) => {
    const { result, myGoals, oppGoals, scorers, opponentScorers } =
      simulateMatch(teamRating, opp.rating, rng, players, opp.name, tactic)
    matches.push({
      opponent: opp.name, opponentRating: opp.rating, result, myGoals, oppGoals,
      scorers, opponentScorers,
      matchLabel: `${matchLabelPrefix} · Match ${idx + 1}`, round: 'GS',
    })
    const st = standings.find(s => s.team === 'Your XI')!
    const oppSt = standings.find(s => s.team === opp.name)!
    st.played++; oppSt.played++
    st.gf += myGoals; st.ga += oppGoals
    oppSt.gf += oppGoals; oppSt.ga += myGoals
    if (result === 'W') { st.won++; st.points += 3; oppSt.lost++ }
    else if (result === 'D') { st.drawn++; st.points += 1; oppSt.drawn++; oppSt.points++ }
    else { st.lost++; oppSt.won++; oppSt.points += 3 }
  })

  for (let i = 0; i < groupOpps.length; i++) {
    for (let j = i + 1; j < groupOpps.length; j++) {
      const a = groupOpps[i], b = groupOpps[j]
      const { result, myGoals, oppGoals } = simulateMatch(a.rating, b.rating, rng)
      const stA = standings.find(s => s.team === a.name)!
      const stB = standings.find(s => s.team === b.name)!
      stA.played++; stB.played++
      stA.gf += myGoals; stA.ga += oppGoals
      stB.gf += oppGoals; stB.ga += myGoals
      if (result === 'W') { stA.won++; stA.points += 3; stB.lost++ }
      else if (result === 'D') { stA.drawn++; stA.points += 1; stB.drawn++; stB.points++ }
      else { stA.lost++; stB.won++; stB.points += 3 }
    }
  }

  standings.sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga))
  const advanced = standings.findIndex(s => s.isPlayer) < 2

  return { matches, standings, advanced }
}

export function simulateUCL(players: DraftedPlayer[], seed?: number, tactic: Tactic = 'balanced'): SeasonResult {
  const rng = seededRandom(seed ?? Math.floor(Math.random() * 1e9))
  const teamRating = calcTeamRating(players)
  const pool = shuffleOpponents(UCL_OPPONENTS, rng)
  const groupOpps = pool.slice(0, 3)

  const { matches: groupMatches, standings, advanced } = groupSimulate(
    teamRating, groupOpps, rng, 'Group Stage', players, tactic
  )

  const rounds = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
  const oppPool = shuffleOpponents(pool.slice(3), rng)
  const allMatches = [...groupMatches]
  let eliminated = !advanced
  let eliminatedAt = advanced ? '' : 'Group Stage'

  if (advanced) {
    rounds.forEach((round, i) => {
      if (eliminated) return
      const opp = oppPool[i] ?? { name: 'Unknown Opponent', rating: 85 + i * 2 }
      const bonus = i * 1.5
      const { result, myGoals, oppGoals, scorers, opponentScorers } =
        simulateMatch(teamRating, opp.rating + bonus, rng, players, opp.name, tactic)
      allMatches.push({ opponent: opp.name, opponentRating: opp.rating, result, myGoals, oppGoals, scorers, opponentScorers, round })
      if (result !== 'W') { eliminated = true; eliminatedAt = round }
    })
  }

  const won = allMatches.filter(m => m.result === 'W').length
  const drawn = allMatches.filter(m => m.result === 'D').length
  const lost = allMatches.filter(m => m.result === 'L').length
  const gf = allMatches.reduce((s, m) => s + m.myGoals, 0)
  const ga = allMatches.reduce((s, m) => s + m.oppGoals, 0)
  const trophyWon = !eliminated

  const { topScorers, playerOfSeason } = buildStats(allMatches)
  const achievements = getAchievements(won, drawn, lost, gf, ga, trophyWon, 'ucl')

  return {
    matches: allMatches, points: won * 3 + drawn, won, drawn, lost,
    goalsFor: gf, goalsAgainst: ga,
    isPerfect: lost === 0 && drawn === 0,
    eliminated, eliminatedAt, trophyWon, teamRating,
    groupStandings: [standings],
    topScorers, playerOfSeason, achievements,
  }
}

export function simulateWorldCup(players: DraftedPlayer[], seed?: number, tactic: Tactic = 'balanced', opponents: { name: string; rating: number }[] = WC_OPPONENTS): SeasonResult {
  const rng = seededRandom(seed ?? Math.floor(Math.random() * 1e9))
  const teamRating = calcTeamRating(players)
  const pool = shuffleOpponents(opponents, rng)
  const groupOpps = pool.slice(0, 3)

  const { matches: groupMatches, standings, advanced } = groupSimulate(
    teamRating, groupOpps, rng, 'Group Stage', players, tactic
  )

  const rounds = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
  const oppPool = shuffleOpponents(pool.slice(3), rng)
  const allMatches = [...groupMatches]
  let eliminated = !advanced
  let eliminatedAt = advanced ? '' : 'Group Stage'

  if (advanced) {
    rounds.forEach((round, i) => {
      if (eliminated) return
      const opp = oppPool[i] ?? { name: 'Unknown', rating: 83 + i * 2 }
      const { result, myGoals, oppGoals, scorers, opponentScorers } =
        simulateMatch(teamRating, opp.rating + i * 2, rng, players, opp.name, tactic)
      allMatches.push({ opponent: opp.name, opponentRating: opp.rating, result, myGoals, oppGoals, scorers, opponentScorers, round })
      if (result === 'L') { eliminated = true; eliminatedAt = round }
    })
  }

  const won = allMatches.filter(m => m.result === 'W').length
  const drawn = allMatches.filter(m => m.result === 'D').length
  const lost = allMatches.filter(m => m.result === 'L').length
  const gf = allMatches.reduce((s, m) => s + m.myGoals, 0)
  const ga = allMatches.reduce((s, m) => s + m.oppGoals, 0)
  const trophyWon = !eliminated

  const { topScorers, playerOfSeason } = buildStats(allMatches)
  const achievements = getAchievements(won, drawn, lost, gf, ga, trophyWon, 'worldcup')

  return {
    matches: allMatches, points: won * 3 + drawn, won, drawn, lost,
    goalsFor: gf, goalsAgainst: ga,
    isPerfect: lost === 0 && drawn === 0,
    eliminated, eliminatedAt, trophyWon, teamRating,
    groupStandings: [standings],
    topScorers, playerOfSeason, achievements,
  }
}

// World Cup 2026 — the real format. Your XI is slotted into a random nation's
// place: a proper 4-team group (one team per seeding pot), then the full
// knockout path (Round of 32 → Final). Top 2 advance automatically; a 3rd
// place can sneak through as a best-third.
export function simulateWorldCup2026(players: DraftedPlayer[], seed?: number, tactic: Tactic = 'balanced'): SeasonResult {
  const rng = seededRandom(seed ?? Math.floor(Math.random() * 1e9))
  const teamRating = calcTeamRating(players)

  // You replace a random nation in a real WC2026 group, inheriting its three
  // group opponents from the actual draw.
  const groupLetters = Object.keys(WC2026_GROUPS)
  const groupLetter = groupLetters[Math.floor(rng() * groupLetters.length)]
  const slotIdx = Math.floor(rng() * 4)
  const groupOpps = WC2026_GROUPS[groupLetter]
    .filter((_, i) => i !== slotIdx)
    .map(name => ({ name, rating: WC2026_RATING.get(name) ?? 80 }))

  const { matches: groupMatches, standings } = groupSimulate(
    teamRating, groupOpps, rng, `Group ${groupLetter}`, players, tactic
  )

  // Your finishing position in the group.
  const myPos = standings.findIndex(s => s.isPlayer) // 0-based
  const myPoints = standings.find(s => s.isPlayer)?.points ?? 0
  let advanced = myPos < 2
  // 3rd place: 8 of 12 thirds advance — likelier with more points.
  if (!advanced && myPos === 2) {
    const chance = Math.min(0.9, 0.25 + myPoints * 0.12)
    advanced = rng() < chance
  }

  const rounds = ['Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']
  // Knockout opponents get stronger each round (narrowing top slices of the field).
  const sliceMax = [40, 26, 16, 8, 4]
  const used = new Set<string>([...groupOpps.map(o => o.name)])
  const allMatches = [...groupMatches]
  let eliminated = !advanced
  let eliminatedAt = advanced ? '' : 'Group Stage'

  if (advanced) {
    rounds.forEach((round, i) => {
      if (eliminated) return
      const slice = WC2026_NATIONS.slice(0, sliceMax[i]).filter(n => !used.has(n.name))
      const opp = slice.length > 0
        ? slice[Math.floor(rng() * slice.length)]
        : { name: 'Finalist', rating: 86 + i }
      used.add(opp.name)
      const { result, myGoals, oppGoals, scorers, opponentScorers } =
        simulateMatch(teamRating, opp.rating + i, rng, players, opp.name, tactic)
      allMatches.push({ opponent: opp.name, opponentRating: opp.rating, result, myGoals, oppGoals, scorers, opponentScorers, round })
      if (result === 'L') { eliminated = true; eliminatedAt = round }
    })
  }

  const won = allMatches.filter(m => m.result === 'W').length
  const drawn = allMatches.filter(m => m.result === 'D').length
  const lost = allMatches.filter(m => m.result === 'L').length
  const gf = allMatches.reduce((s, m) => s + m.myGoals, 0)
  const ga = allMatches.reduce((s, m) => s + m.oppGoals, 0)
  const trophyWon = !eliminated

  const { topScorers, playerOfSeason } = buildStats(allMatches)
  const achievements = getAchievements(won, drawn, lost, gf, ga, trophyWon, 'worldcup2026')

  return {
    matches: allMatches, points: won * 3 + drawn, won, drawn, lost,
    goalsFor: gf, goalsAgainst: ga,
    isPerfect: lost === 0 && drawn === 0,
    eliminated, eliminatedAt, trophyWon, teamRating,
    groupStandings: [standings],
    topScorers, playerOfSeason, achievements,
  }
}

export function runSimulation(players: DraftedPlayer[], leagueId: LeagueId, seed?: number, tactic: Tactic = 'balanced'): SeasonResult {
  if (leagueId === 'ucl') return simulateUCL(players, seed, tactic)
  if (leagueId === 'worldcup') return simulateWorldCup(players, seed, tactic)
  if (leagueId === 'worldcup2026') return simulateWorldCup2026(players, seed, tactic)
  return simulateLeagueSeason(players, leagueId, seed, tactic)
}
