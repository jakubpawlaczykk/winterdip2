// =========================================================
// Dane sklepu. TODO: podmień ceny, opisy i opinie na prawdziwe
// przed uruchomieniem sprzedaży.
// =========================================================

export const SHOP = {
  currency: 'zł',
  freeShippingFrom: 149,
  shippingCost: 14.99,
  // ostatni dzień zamówień z gwarancją dostawy przed Wigilią
  christmasCutoff: '2026-12-19T23:59:59+01:00',
};

export const PRODUCTS = {
  'chocolate-mug': {
    id: 'chocolate-mug',
    name: 'Chocolate… kubek do fondue',
    short: 'Ceramiczny kubek z podgrzewaczem i widelczykiem',
    price: 89,
    oldPrice: 119,
    img: 'assets/img/mug.webp',
    badge: 'Bestseller',
  },
  'chocolate-duo': {
    id: 'chocolate-duo',
    name: 'Zestaw dla dwojga',
    short: '2 × kubek Chocolate… + 12 podgrzewaczy gratis',
    price: 159,
    oldPrice: 238,
    img: 'assets/img/mug.webp',
    duo: true,
    badge: 'Najlepszy prezent',
  },
  'tealights': {
    id: 'tealights',
    name: 'Podgrzewacze 12 szt.',
    short: 'Zapas na 12 wieczorów',
    price: 19,
    img: 'assets/img/mug.webp',
    addon: true,
  },
};

// UWAGA: przykładowe opinie (placeholder). Przed publikacją zastąp
// prawdziwymi opiniami klientów albo podłącz widget opinii.
export const REVIEWS = [
  { name: 'Placeholder A.', city: 'Kraków', text: 'Wieczór z tym kubkiem to mały rytuał. Czekolada długo trzyma temperaturę.', stars: 5 },
  { name: 'Placeholder M.', city: 'Gdańsk', text: 'Kupiłam jako prezent na Mikołajki — zachwyt od pierwszego rozpakowania.', stars: 5 },
  { name: 'Placeholder K.', city: 'Poznań', text: 'Świetna jakość ceramiki, kolor dokładnie jak na zdjęciach.', stars: 5 },
  { name: 'Placeholder T.', city: 'Wrocław', text: 'Fondue dla jednej osoby bez bałaganu. Idealne na zimowe wieczory.', stars: 5 },
  { name: 'Placeholder J.', city: 'Warszawa', text: 'Zestaw dla dwojga wziąłem na randkę w domu. Strzał w dziesiątkę.', stars: 5 },
  { name: 'Placeholder O.', city: 'Łódź', text: 'Szybka wysyłka, porządnie zapakowane, kubek robi wrażenie.', stars: 4 },
  { name: 'Placeholder E.', city: 'Lublin', text: 'Truskawki w czekoladzie przy kominku — więcej nie trzeba.', stars: 5 },
  { name: 'Placeholder P.', city: 'Szczecin', text: 'Widelczyk wygodnie trzyma się w uchu kubka. Przemyślany detal.', stars: 5 },
  { name: 'Placeholder R.', city: 'Rzeszów', text: 'Dzieci zachwycone — wieczór z owocami w czekoladzie stał się naszą tradycją.', stars: 5 },
  { name: 'Placeholder B.', city: 'Białystok', text: 'Kolor kubka na żywo jeszcze ładniejszy. Idealnie pasuje do świąt.', stars: 5 },
  { name: 'Placeholder N.', city: 'Bydgoszcz', text: 'Podarowałam mamie, teraz sama chcę drugi dla siebie.', stars: 5 },
  { name: 'Placeholder Z.', city: 'Zakopane', text: 'Po nartach nie ma nic lepszego niż ciepła czekolada z tego kubka.', stars: 5 },
  { name: 'Placeholder G.', city: 'Gdynia', text: 'Świetny prezent dla pary. Zestaw dla dwojga robi robotę.', stars: 5 },
  { name: 'Placeholder S.', city: 'Katowice', text: 'Podgrzewacz trzyma temperaturę dłużej, niż się spodziewałem.', stars: 4 },
  { name: 'Placeholder O.', city: 'Olsztyn', text: 'Ładnie zapakowany, gotowy do położenia pod choinkę.', stars: 5 },
  { name: 'Placeholder T.', city: 'Toruń', text: 'Pierniki maczane w czekoladzie — od teraz obowiązkowo co weekend.', stars: 5 },
];

// Miasta do wizualizacji zamówień na globusie [lat, lon]
export const CITIES = [
  { name: 'Warszawa', lat: 52.23, lon: 21.01, w: 10 },
  { name: 'Kraków', lat: 50.06, lon: 19.94, w: 7 },
  { name: 'Wrocław', lat: 51.11, lon: 17.03, w: 6 },
  { name: 'Poznań', lat: 52.41, lon: 16.93, w: 5 },
  { name: 'Gdańsk', lat: 54.35, lon: 18.65, w: 5 },
  { name: 'Łódź', lat: 51.76, lon: 19.46, w: 5 },
  { name: 'Szczecin', lat: 53.43, lon: 14.55, w: 3 },
  { name: 'Lublin', lat: 51.25, lon: 22.57, w: 3 },
  { name: 'Katowice', lat: 50.26, lon: 19.02, w: 4 },
  { name: 'Białystok', lat: 53.13, lon: 23.16, w: 2 },
  { name: 'Rzeszów', lat: 50.04, lon: 22.0, w: 2 },
  { name: 'Bydgoszcz', lat: 53.12, lon: 18.0, w: 3 },
  { name: 'Olsztyn', lat: 53.78, lon: 20.48, w: 2 },
  { name: 'Zakopane', lat: 49.3, lon: 19.95, w: 2 },
  { name: 'Toruń', lat: 53.01, lon: 18.6, w: 2 },
  { name: 'Opole', lat: 50.67, lon: 17.93, w: 1 },
  { name: 'Kielce', lat: 50.87, lon: 20.63, w: 1 },
  { name: 'Zielona Góra', lat: 51.94, lon: 15.51, w: 1 },
];

export const FAQ = [
  ['Jak działa kubek do fondue?', 'Do otworu w podstawie wkładasz zwykły podgrzewacz (tealight). Płomień utrzymuje czekoladę w płynnej, ciepłej formie przez cały wieczór. Widelczyk wsuwasz w uchwyt, gdy go nie używasz.'],
  ['Kiedy dostanę zamówienie?', 'Wysyłamy w ciągu 24 h w dni robocze. Kurier lub paczkomat dostarcza zwykle w 1–2 dni. Zamówienia złożone do 19 grudnia dotrą przed Wigilią.'],
  ['Czy wysyłka jest darmowa?', 'Tak — przy zamówieniach od 149 zł. Poniżej tej kwoty wysyłka kosztuje 14,99 zł.'],
  ['Czy kubek można myć w zmywarce?', 'Ceramikę możesz myć w zmywarce, ale polecamy mycie ręczne, żeby napis i szkliwo zostały piękne na lata. Widelczyk myj ręcznie.'],
  ['Jakiej czekolady użyć?', 'Najlepiej sprawdza się czekolada deserowa lub mleczna w kostkach, rozpuszczona z odrobiną śmietanki. Możesz też użyć sera — wtedy masz mini fondue serowe.'],
  ['Czy mogę zwrócić produkt?', 'Masz 30 dni na zwrot bez podawania przyczyny. Na prezenty kupione w listopadzie i grudniu termin zwrotu liczymy do 31 stycznia.'],
  ['Czy pakujecie na prezent?', 'Każdy kubek trafia do eleganckiego pudełka. Przy zamówieniu możesz dodać darmowy bilecik z życzeniami.'],
];
