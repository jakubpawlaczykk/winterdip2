# Winterdip

Landing page i sklep dla kubka do czekoladowego fondue **Chocolate…**. Strona jest statyczna (HTML + CSS + JS), bez kroku budowania.

## Struktura
- `index.html`: landing (hero sterowany scrollem → produkty → opinie → galeria → globus z zamówieniami → FAQ → kontakt → stopka)
- `produkty.html`: podstrona sprzedażowa z 2 produktami, porównaniem i przyklejonym paskiem zakupu
- `js/data.js`: **tu edytujesz ceny, produkty, opinie, FAQ i datę świątecznej wysyłki**
- `js/hero.js`: odtwarzacz klatek na `<canvas>` (scroll scrubbing) z fallbackiem
- `js/globe.js`: globus 3D (Three.js) z zamówieniami na żywo
- `js/cart.js`: koszyk (localStorage) z paskiem darmowej dostawy i upsellem

## Film w hero
1. Wygeneruj film w Kling (10 s, 16:9, statyczna kamera).
2. `bash tools/extract-frames.sh film.mp4`
3. Powstaje `assets/hero/` z klatkami i `frames.json`. Hero automatycznie przełącza się z fallbacku na film.

## Zamówienia na żywo (globus)
Domyślnie działa **tryb demo** z widoczną plakietką. Żeby pokazać prawdziwe zamówienia, ustaw przed `main.js`:
```html
<script>window.WINTERDIP_ORDERS_URL = 'https://twoj-backend/orders.json'</script>
```
Endpoint ma zwracać `[{ "city": "Kraków", "product": "chocolate-mug", "ts": 1731150000000 }]`. Najlepiej podpiąć go pod webhook sklepu (Shopify lub Stripe).

## Przed startem sprzedaży
- [ ] Prawdziwe ceny, wymiary i pojemność (`js/data.js`, `produkty.html`)
- [ ] Prawdziwe opinie klientów zamiast placeholderów
- [ ] Podpięta kasa (Shopify, Stripe lub Przelewy24): przycisk „Przejdź do kasy” w `js/cart.js`
- [ ] Endpoint zamówień dla globusa
- [ ] Potwierdzone warunki: wysyłka 24 h, 30 dni na zwrot, termin świąteczny
- [ ] Regulamin i polityka prywatności, e-mail i social media w stopce

## Lokalnie
```bash
npx http-server -p 5173 -c-1
```
