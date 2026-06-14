import type { ClubSeason } from '../types'

// World Cup 2026 contender squads at current (2025/26) form. Used by the
// time-gated WC2026 event. Players are drafted across nations to build an XI,
// then face the field in a knockout run.
export const worldCup2026Data: ClubSeason[] = [
  {
    id: 'argentina-wc2026', club: 'Argentina', shortName: 'ARG', season: 'World Cup 2026', league: 'worldcup2026', color: '#6CACE4',
    players: [
      { id: 'emartinez-arg26', name: 'Emiliano Martínez', position: 'GK', rating: 87, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina' },
      { id: 'molina-arg26', name: 'Nahuel Molina', position: 'DEF', rating: 80, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['RB'] },
      { id: 'romero-arg26', name: 'Cristian Romero', position: 'DEF', rating: 86, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['CB'] },
      { id: 'lmartinez-arg26', name: 'Lisandro Martínez', position: 'DEF', rating: 83, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['CB', 'LB'] },
      { id: 'tagliafico-arg26', name: 'Nicolás Tagliafico', position: 'DEF', rating: 80, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['LB'] },
      { id: 'depaul-arg26', name: 'Rodrigo De Paul', position: 'MID', rating: 83, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['CM', 'DM'] },
      { id: 'macallister-arg26', name: 'Alexis Mac Allister', position: 'MID', rating: 86, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['CM', 'DM'] },
      { id: 'enzo-arg26', name: 'Enzo Fernández', position: 'MID', rating: 85, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['CM', 'AM'] },
      { id: 'messi-arg26', name: 'Lionel Messi', position: 'FWD', rating: 89, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['RW', 'AM'] },
      { id: 'lautaro-arg26', name: 'Lautaro Martínez', position: 'FWD', rating: 87, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['ST'] },
      { id: 'alvarez-arg26', name: 'Julián Álvarez', position: 'FWD', rating: 87, club: 'Argentina', season: 'World Cup 2026', nationality: 'Argentina', altPositions: ['ST', 'AM'] },
    ]
  },
  {
    id: 'france-wc2026', club: 'France', shortName: 'FRA', season: 'World Cup 2026', league: 'worldcup2026', color: '#002395',
    players: [
      { id: 'maignan-fra26', name: 'Mike Maignan', position: 'GK', rating: 86, club: 'France', season: 'World Cup 2026', nationality: 'France' },
      { id: 'kounde-fra26', name: 'Jules Koundé', position: 'DEF', rating: 85, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['RB', 'CB'] },
      { id: 'saliba-fra26', name: 'William Saliba', position: 'DEF', rating: 86, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['CB'] },
      { id: 'upamecano-fra26', name: 'Dayot Upamecano', position: 'DEF', rating: 84, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['CB'] },
      { id: 'theo-fra26', name: 'Theo Hernández', position: 'DEF', rating: 84, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['LB', 'LWB'] },
      { id: 'tchouameni-fra26', name: 'Aurélien Tchouaméni', position: 'MID', rating: 85, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['DM', 'CM'] },
      { id: 'camavinga-fra26', name: 'Eduardo Camavinga', position: 'MID', rating: 84, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['CM', 'DM'] },
      { id: 'griezmann-fra26', name: 'Antoine Griezmann', position: 'MID', rating: 85, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['AM', 'CM'] },
      { id: 'mbappe-fra26', name: 'Kylian Mbappé', position: 'FWD', rating: 93, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['ST', 'LW'] },
      { id: 'dembele-fra26', name: 'Ousmane Dembélé', position: 'FWD', rating: 88, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['RW', 'ST'] },
      { id: 'barcola-fra26', name: 'Bradley Barcola', position: 'FWD', rating: 83, club: 'France', season: 'World Cup 2026', nationality: 'France', altPositions: ['LW'] },
    ]
  },
  {
    id: 'brazil-wc2026', club: 'Brazil', shortName: 'BRA', season: 'World Cup 2026', league: 'worldcup2026', color: '#FFDF00',
    players: [
      { id: 'alisson-bra26', name: 'Alisson', position: 'GK', rating: 88, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil' },
      { id: 'danilo-bra26', name: 'Danilo', position: 'DEF', rating: 79, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['RB', 'CB'] },
      { id: 'marquinhos-bra26', name: 'Marquinhos', position: 'DEF', rating: 85, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['CB'] },
      { id: 'gabrielm-bra26', name: 'Gabriel Magalhães', position: 'DEF', rating: 85, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['CB'] },
      { id: 'carlosaugusto-bra26', name: 'Carlos Augusto', position: 'DEF', rating: 80, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['LB', 'LWB'] },
      { id: 'bruno-bra26', name: 'Bruno Guimarães', position: 'MID', rating: 85, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['CM', 'DM'] },
      { id: 'paqueta-bra26', name: 'Lucas Paquetá', position: 'MID', rating: 83, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['AM', 'CM'] },
      { id: 'andre-bra26', name: 'André', position: 'MID', rating: 80, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['DM', 'CM'] },
      { id: 'vinicius-bra26', name: 'Vinícius Júnior', position: 'FWD', rating: 90, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['LW'] },
      { id: 'raphinha-bra26', name: 'Raphinha', position: 'FWD', rating: 88, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['RW', 'LW'] },
      { id: 'rodrygo-bra26', name: 'Rodrygo', position: 'FWD', rating: 86, club: 'Brazil', season: 'World Cup 2026', nationality: 'Brazil', altPositions: ['RW', 'LW'] },
    ]
  },
  {
    id: 'england-wc2026', club: 'England', shortName: 'ENG', season: 'World Cup 2026', league: 'worldcup2026', color: '#FFFFFF',
    players: [
      { id: 'pickford-eng26', name: 'Jordan Pickford', position: 'GK', rating: 84, club: 'England', season: 'World Cup 2026', nationality: 'England' },
      { id: 'reecejames-eng26', name: 'Reece James', position: 'DEF', rating: 84, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['RB', 'RWB'] },
      { id: 'stones-eng26', name: 'John Stones', position: 'DEF', rating: 84, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['CB'] },
      { id: 'guehi-eng26', name: 'Marc Guéhi', position: 'DEF', rating: 82, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['CB'] },
      { id: 'lewishall-eng26', name: 'Lewis Hall', position: 'DEF', rating: 80, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['LB', 'LWB'] },
      { id: 'rice-eng26', name: 'Declan Rice', position: 'MID', rating: 88, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['DM', 'CM'] },
      { id: 'bellingham-eng26', name: 'Jude Bellingham', position: 'MID', rating: 90, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['AM', 'CM'] },
      { id: 'palmer-eng26', name: 'Cole Palmer', position: 'MID', rating: 88, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['AM', 'RW'] },
      { id: 'saka-eng26', name: 'Bukayo Saka', position: 'FWD', rating: 89, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['RW'] },
      { id: 'kane-eng26', name: 'Harry Kane', position: 'FWD', rating: 90, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['ST'] },
      { id: 'foden-eng26', name: 'Phil Foden', position: 'FWD', rating: 88, club: 'England', season: 'World Cup 2026', nationality: 'England', altPositions: ['AM', 'LW'] },
    ]
  },
  {
    id: 'spain-wc2026', club: 'Spain', shortName: 'ESP', season: 'World Cup 2026', league: 'worldcup2026', color: '#C60B1E',
    players: [
      { id: 'unaisimon-esp26', name: 'Unai Simón', position: 'GK', rating: 85, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain' },
      { id: 'porro-esp26', name: 'Pedro Porro', position: 'DEF', rating: 81, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['RB', 'RWB'] },
      { id: 'lenormand-esp26', name: 'Robin Le Normand', position: 'DEF', rating: 83, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['CB'] },
      { id: 'huijsen-esp26', name: 'Dean Huijsen', position: 'DEF', rating: 82, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['CB'] },
      { id: 'cucurella-esp26', name: 'Marc Cucurella', position: 'DEF', rating: 83, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['LB', 'LWB'] },
      { id: 'rodri-esp26', name: 'Rodri', position: 'MID', rating: 91, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['DM', 'CM'] },
      { id: 'pedri-esp26', name: 'Pedri', position: 'MID', rating: 90, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['CM', 'AM'] },
      { id: 'fabian-esp26', name: 'Fabián Ruiz', position: 'MID', rating: 85, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['CM', 'AM'] },
      { id: 'yamal-esp26', name: 'Lamine Yamal', position: 'FWD', rating: 91, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['RW'] },
      { id: 'nicowilliams-esp26', name: 'Nico Williams', position: 'FWD', rating: 86, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['LW', 'RW'] },
      { id: 'oyarzabal-esp26', name: 'Mikel Oyarzabal', position: 'FWD', rating: 84, club: 'Spain', season: 'World Cup 2026', nationality: 'Spain', altPositions: ['ST', 'LW'] },
    ]
  },
  {
    id: 'portugal-wc2026', club: 'Portugal', shortName: 'POR', season: 'World Cup 2026', league: 'worldcup2026', color: '#006600',
    players: [
      { id: 'diogocosta-por26', name: 'Diogo Costa', position: 'GK', rating: 85, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal' },
      { id: 'dalot-por26', name: 'Diogo Dalot', position: 'DEF', rating: 82, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['RB', 'LB'] },
      { id: 'rubendias-por26', name: 'Rúben Dias', position: 'DEF', rating: 88, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['CB'] },
      { id: 'inacio-por26', name: 'Gonçalo Inácio', position: 'DEF', rating: 82, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['CB'] },
      { id: 'nunomendes-por26', name: 'Nuno Mendes', position: 'DEF', rating: 86, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['LB', 'LWB'] },
      { id: 'vitinha-por26', name: 'Vitinha', position: 'MID', rating: 88, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['CM', 'DM'] },
      { id: 'joaoneves-por26', name: 'João Neves', position: 'MID', rating: 85, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['CM', 'DM'] },
      { id: 'brunof-por26', name: 'Bruno Fernandes', position: 'MID', rating: 87, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['AM', 'CM'] },
      { id: 'leao-por26', name: 'Rafael Leão', position: 'FWD', rating: 86, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['LW', 'ST'] },
      { id: 'ronaldo-por26', name: 'Cristiano Ronaldo', position: 'FWD', rating: 83, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['ST'] },
      { id: 'bernardo-por26', name: 'Bernardo Silva', position: 'FWD', rating: 86, club: 'Portugal', season: 'World Cup 2026', nationality: 'Portugal', altPositions: ['RW', 'AM'] },
    ]
  },
  {
    id: 'germany-wc2026', club: 'Germany', shortName: 'GER', season: 'World Cup 2026', league: 'worldcup2026', color: '#111111',
    players: [
      { id: 'terstegen-ger26', name: 'Marc-André ter Stegen', position: 'GK', rating: 86, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany' },
      { id: 'kimmich-ger26', name: 'Joshua Kimmich', position: 'DEF', rating: 86, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['RB', 'DM', 'CM'] },
      { id: 'rudiger-ger26', name: 'Antonio Rüdiger', position: 'DEF', rating: 86, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['CB'] },
      { id: 'tah-ger26', name: 'Jonathan Tah', position: 'DEF', rating: 83, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['CB'] },
      { id: 'raum-ger26', name: 'David Raum', position: 'DEF', rating: 80, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['LB', 'LWB'] },
      { id: 'andrich-ger26', name: 'Robert Andrich', position: 'MID', rating: 80, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['DM', 'CM'] },
      { id: 'wirtz-ger26', name: 'Florian Wirtz', position: 'MID', rating: 89, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['AM', 'CM'] },
      { id: 'musiala-ger26', name: 'Jamal Musiala', position: 'MID', rating: 89, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['AM', 'CM'] },
      { id: 'gnabry-ger26', name: 'Serge Gnabry', position: 'FWD', rating: 83, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['RW', 'LW'] },
      { id: 'havertz-ger26', name: 'Kai Havertz', position: 'FWD', rating: 84, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['ST', 'AM'] },
      { id: 'sane-ger26', name: 'Leroy Sané', position: 'FWD', rating: 84, club: 'Germany', season: 'World Cup 2026', nationality: 'Germany', altPositions: ['RW', 'LW'] },
    ]
  },
  {
    id: 'netherlands-wc2026', club: 'Netherlands', shortName: 'NED', season: 'World Cup 2026', league: 'worldcup2026', color: '#F36C21',
    players: [
      { id: 'verbruggen-ned26', name: 'Bart Verbruggen', position: 'GK', rating: 81, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands' },
      { id: 'dumfries-ned26', name: 'Denzel Dumfries', position: 'DEF', rating: 82, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['RB', 'RWB'] },
      { id: 'vandijk-ned26', name: 'Virgil van Dijk', position: 'DEF', rating: 88, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['CB'] },
      { id: 'devrij-ned26', name: 'Stefan de Vrij', position: 'DEF', rating: 82, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['CB'] },
      { id: 'ake-ned26', name: 'Nathan Aké', position: 'DEF', rating: 83, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['LB', 'CB'] },
      { id: 'dejong-ned26', name: 'Frenkie de Jong', position: 'MID', rating: 86, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['CM', 'DM'] },
      { id: 'gravenberch-ned26', name: 'Ryan Gravenberch', position: 'MID', rating: 84, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['DM', 'CM'] },
      { id: 'reijnders-ned26', name: 'Tijjani Reijnders', position: 'MID', rating: 85, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['CM', 'AM'] },
      { id: 'gakpo-ned26', name: 'Cody Gakpo', position: 'FWD', rating: 85, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['LW', 'ST'] },
      { id: 'simons-ned26', name: 'Xavi Simons', position: 'FWD', rating: 84, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['AM', 'RW'] },
      { id: 'depay-ned26', name: 'Memphis Depay', position: 'FWD', rating: 82, club: 'Netherlands', season: 'World Cup 2026', nationality: 'Netherlands', altPositions: ['ST', 'AM'] },
    ]
  },
  {
    id: 'belgium-wc2026', club: 'Belgium', shortName: 'BEL', season: 'World Cup 2026', league: 'worldcup2026', color: '#E30613',
    players: [
      { id: 'casteels-bel26', name: 'Koen Casteels', position: 'GK', rating: 81, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium' },
      { id: 'castagne-bel26', name: 'Timothy Castagne', position: 'DEF', rating: 79, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['RB', 'LB'] },
      { id: 'faes-bel26', name: 'Wout Faes', position: 'DEF', rating: 79, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['CB'] },
      { id: 'debast-bel26', name: 'Zeno Debast', position: 'DEF', rating: 79, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['CB'] },
      { id: 'theate-bel26', name: 'Arthur Theate', position: 'DEF', rating: 79, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['LB', 'CB'] },
      { id: 'onana-bel26', name: 'Amadou Onana', position: 'MID', rating: 82, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['DM', 'CM'] },
      { id: 'tielemans-bel26', name: 'Youri Tielemans', position: 'MID', rating: 83, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['CM', 'AM'] },
      { id: 'debruyne-bel26', name: 'Kevin De Bruyne', position: 'MID', rating: 87, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['AM', 'CM'] },
      { id: 'doku-bel26', name: 'Jérémy Doku', position: 'FWD', rating: 84, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['LW', 'RW'] },
      { id: 'lukaku-bel26', name: 'Romelu Lukaku', position: 'FWD', rating: 84, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['ST'] },
      { id: 'trossard-bel26', name: 'Leandro Trossard', position: 'FWD', rating: 82, club: 'Belgium', season: 'World Cup 2026', nationality: 'Belgium', altPositions: ['LW', 'ST'] },
    ]
  },
  {
    id: 'croatia-wc2026', club: 'Croatia', shortName: 'CRO', season: 'World Cup 2026', league: 'worldcup2026', color: '#FF0000',
    players: [
      { id: 'livakovic-cro26', name: 'Dominik Livaković', position: 'GK', rating: 81, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia' },
      { id: 'stanisic-cro26', name: 'Josip Stanišić', position: 'DEF', rating: 80, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['RB', 'CB'] },
      { id: 'gvardiol-cro26', name: 'Joško Gvardiol', position: 'DEF', rating: 86, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['CB', 'LB'] },
      { id: 'sutalo-cro26', name: 'Josip Šutalo', position: 'DEF', rating: 79, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['CB'] },
      { id: 'sosa-cro26', name: 'Borna Sosa', position: 'DEF', rating: 79, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['LB', 'LWB'] },
      { id: 'modric-cro26', name: 'Luka Modrić', position: 'MID', rating: 84, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['CM', 'AM'] },
      { id: 'kovacic-cro26', name: 'Mateo Kovačić', position: 'MID', rating: 84, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['CM', 'DM'] },
      { id: 'brozovic-cro26', name: 'Marcelo Brozović', position: 'MID', rating: 82, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['DM', 'CM'] },
      { id: 'kramaric-cro26', name: 'Andrej Kramarić', position: 'FWD', rating: 81, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['AM', 'ST'] },
      { id: 'budimir-cro26', name: 'Ante Budimir', position: 'FWD', rating: 80, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['ST'] },
      { id: 'perisic-cro26', name: 'Ivan Perišić', position: 'FWD', rating: 80, club: 'Croatia', season: 'World Cup 2026', nationality: 'Croatia', altPositions: ['LW', 'LM'] },
    ]
  },
  {
    id: 'uruguay-wc2026', club: 'Uruguay', shortName: 'URU', season: 'World Cup 2026', league: 'worldcup2026', color: '#5CBFEB',
    players: [
      { id: 'rochet-uru26', name: 'Sergio Rochet', position: 'GK', rating: 79, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay' },
      { id: 'nandez-uru26', name: 'Nahitan Nández', position: 'DEF', rating: 79, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['RB', 'CM'] },
      { id: 'araujo-uru26', name: 'Ronald Araújo', position: 'DEF', rating: 85, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['CB', 'RB'] },
      { id: 'gimenez-uru26', name: 'José María Giménez', position: 'DEF', rating: 84, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['CB'] },
      { id: 'olivera-uru26', name: 'Mathías Olivera', position: 'DEF', rating: 80, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['LB', 'CB'] },
      { id: 'ugarte-uru26', name: 'Manuel Ugarte', position: 'MID', rating: 81, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['DM', 'CM'] },
      { id: 'valverde-uru26', name: 'Federico Valverde', position: 'MID', rating: 89, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['CM', 'RW'] },
      { id: 'delacruz-uru26', name: 'Nicolás de la Cruz', position: 'MID', rating: 81, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['AM', 'CM'] },
      { id: 'pellistri-uru26', name: 'Facundo Pellistri', position: 'FWD', rating: 79, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['RW'] },
      { id: 'nunez-uru26', name: 'Darwin Núñez', position: 'FWD', rating: 83, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['ST'] },
      { id: 'pellistri2-uru26', name: 'Maximiliano Araújo', position: 'FWD', rating: 78, club: 'Uruguay', season: 'World Cup 2026', nationality: 'Uruguay', altPositions: ['LW'] },
    ]
  },
  {
    id: 'morocco-wc2026', club: 'Morocco', shortName: 'MAR', season: 'World Cup 2026', league: 'worldcup2026', color: '#C1272D',
    players: [
      { id: 'bounou-mar26', name: 'Yassine Bounou', position: 'GK', rating: 83, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco' },
      { id: 'hakimi-mar26', name: 'Achraf Hakimi', position: 'DEF', rating: 86, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['RB', 'RWB'] },
      { id: 'aguerd-mar26', name: 'Nayef Aguerd', position: 'DEF', rating: 81, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['CB'] },
      { id: 'saiss-mar26', name: 'Romain Saïss', position: 'DEF', rating: 79, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['CB'] },
      { id: 'mazraoui-mar26', name: 'Noussair Mazraoui', position: 'DEF', rating: 81, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['LB', 'RB'] },
      { id: 'amrabat-mar26', name: 'Sofyan Amrabat', position: 'MID', rating: 80, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['DM', 'CM'] },
      { id: 'ounahi-mar26', name: 'Azzedine Ounahi', position: 'MID', rating: 80, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['CM', 'AM'] },
      { id: 'ziyech-mar26', name: 'Hakim Ziyech', position: 'MID', rating: 81, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['AM', 'RW'] },
      { id: 'brahim-mar26', name: 'Brahim Díaz', position: 'FWD', rating: 83, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['AM', 'RW'] },
      { id: 'ennesyri-mar26', name: 'Youssef En-Nesyri', position: 'FWD', rating: 81, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['ST'] },
      { id: 'boufal-mar26', name: 'Sofiane Boufal', position: 'FWD', rating: 79, club: 'Morocco', season: 'World Cup 2026', nationality: 'Morocco', altPositions: ['LW', 'AM'] },
    ]
  },
  {
    id: 'usa-wc2026', club: 'USA', shortName: 'USA', season: 'World Cup 2026', league: 'worldcup2026', color: '#1A3668',
    players: [
      { id: 'turner-usa26', name: 'Matt Turner', position: 'GK', rating: 78, club: 'USA', season: 'World Cup 2026', nationality: 'USA' },
      { id: 'dest-usa26', name: 'Sergiño Dest', position: 'DEF', rating: 80, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['RB', 'RWB'] },
      { id: 'richards-usa26', name: 'Chris Richards', position: 'DEF', rating: 79, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['CB'] },
      { id: 'ream-usa26', name: 'Tim Ream', position: 'DEF', rating: 77, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['CB', 'LB'] },
      { id: 'arobinson-usa26', name: 'Antonee Robinson', position: 'DEF', rating: 81, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['LB'] },
      { id: 'adams-usa26', name: 'Tyler Adams', position: 'MID', rating: 80, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['DM', 'CM'] },
      { id: 'mckennie-usa26', name: 'Weston McKennie', position: 'MID', rating: 81, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['CM', 'AM'] },
      { id: 'musah-usa26', name: 'Yunus Musah', position: 'MID', rating: 79, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['CM', 'DM'] },
      { id: 'pulisic-usa26', name: 'Christian Pulisic', position: 'FWD', rating: 85, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['LW', 'RW'] },
      { id: 'balogun-usa26', name: 'Folarin Balogun', position: 'FWD', rating: 80, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['ST'] },
      { id: 'weah-usa26', name: 'Tim Weah', position: 'FWD', rating: 78, club: 'USA', season: 'World Cup 2026', nationality: 'USA', altPositions: ['RW', 'RWB'] },
    ]
  },
  {
    id: 'mexico-wc2026', club: 'Mexico', shortName: 'MEX', season: 'World Cup 2026', league: 'worldcup2026', color: '#006847',
    players: [
      { id: 'malagon-mex26', name: 'Luis Malagón', position: 'GK', rating: 78, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico' },
      { id: 'jsanchez-mex26', name: 'Jorge Sánchez', position: 'DEF', rating: 77, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['RB'] },
      { id: 'montes-mex26', name: 'César Montes', position: 'DEF', rating: 79, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['CB'] },
      { id: 'vasquez-mex26', name: 'Johan Vásquez', position: 'DEF', rating: 80, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['CB', 'LB'] },
      { id: 'gallardo-mex26', name: 'Jesús Gallardo', position: 'DEF', rating: 77, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['LB', 'LWB'] },
      { id: 'edsonalvarez-mex26', name: 'Edson Álvarez', position: 'MID', rating: 82, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['DM', 'CM'] },
      { id: 'chavez-mex26', name: 'Luis Chávez', position: 'MID', rating: 79, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['CM', 'DM'] },
      { id: 'pineda-mex26', name: 'Orbelín Pineda', position: 'MID', rating: 80, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['AM', 'CM'] },
      { id: 'lozano-mex26', name: 'Hirving Lozano', position: 'FWD', rating: 82, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['RW', 'LW'] },
      { id: 'sgimenez-mex26', name: 'Santiago Giménez', position: 'FWD', rating: 81, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['ST'] },
      { id: 'vega-mex26', name: 'Alexis Vega', position: 'FWD', rating: 79, club: 'Mexico', season: 'World Cup 2026', nationality: 'Mexico', altPositions: ['LW', 'AM'] },
    ]
  },
]
