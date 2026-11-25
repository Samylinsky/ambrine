'use strict';
/* Parcours guidés : chaque choix ajoute un morceau de phrase correct en français.
   I(carte, "texte dit", suite, options) — suite = écran suivant (sinon la phrase est finie)
   options.replace = le morceau remplace le mot précédent (ex. « jouer » -> « faire du vélo »).
   Un nœud peut avoir : pre (mot ajouté devant), preAgain (devant, après « Et après… »), preReplace, cont (suite « Et après… »). */
function buildFlows(find) {
  const miss = [];
  const R = ref => {
    if (typeof ref !== 'string') return Object.assign({ id: 'i_' + ref.label, section: 'communique' }, ref);
    const c = find(ref);
    if (!c) { miss.push(ref); return { id: 'i_' + ref, label: ref, emoji: '❓', section: 'communique' }; }
    return c;
  };
  const I = (ref, say, next, o) => Object.assign({ c: R(ref), say, next }, o || {});
  const JOUER = { label: 'Jouer', emoji: '🎲' };
  const END = I({ label: 'C’est tout', emoji: '✅' }, '');
  const SKIP = next => I({ label: 'Passer', emoji: '⏭️' }, '', next);

  /* ================= POURQUOI ? (après une émotion) ================= */
  const becHappy = { title: 'Pourquoi je suis contente ?', items: [
    I('Parc', 'parce que je vais au parc'), I('Piscine', 'parce que je vais à la piscine'), I('Papa', 'parce que je vois papa'),
    I('Maman', 'parce que je vois maman'), I('Mamie', 'parce que je vois mamie'), I('Copines', 'parce que j’ai joué avec mes copines'),
    I('Cadeau', 'parce que j’ai un cadeau'), I('Anniversaire', 'parce que c’est mon anniversaire'), I('Glace', 'parce que je mange une glace'),
    I('iPad', 'parce que j’ai l’iPad'), I('Un câlin', 'parce qu’on m’a fait un câlin'), I('Vélo', 'parce que je fais du vélo'),
    I('C’était bien', 'parce que c’était bien'), END] };
  const becSad = { title: 'Pourquoi je suis triste ?', items: [
    I('Parti', 'parce que papa est parti'), I('Maman', 'parce que maman n’est pas là'), I('Copines', 'parce que mes copines ne sont pas là'),
    I('iPad', 'parce que je n’ai pas eu l’iPad'), I('On m’embête', 'parce qu’on m’embête'), I('Malade', 'parce que je suis malade'),
    I('J’ai mal au ventre', 'parce que j’ai mal'), I('Maison', 'parce que je veux rentrer à la maison'), I('Fatiguée', 'parce que je suis fatiguée'),
    I('Toute seule', 'parce que je suis toute seule'), I('Ce n’était pas bien', 'parce que ce n’était pas bien'), END] };
  const becAngry = { title: 'Pourquoi je suis énervée ?', items: [
    I('Trop de bruit', 'parce qu’il y a trop de bruit'), I('Trop de monde', 'parce qu’il y a trop de monde'), I('On m’embête', 'parce qu’on m’embête'),
    I('Je ne veux pas', 'parce que je ne veux pas'), I('Je n’aime pas', 'parce que je n’aime pas ça'), I('iPad', 'parce que je veux l’iPad'),
    I('Attendre', 'parce que je dois attendre'), I('Je ne comprends pas', 'parce que je ne comprends pas'), I('Fatiguée', 'parce que je suis fatiguée'), END] };
  const becTired = { title: 'Pourquoi je suis fatiguée ?', items: [
    I(JOUER, 'parce que j’ai beaucoup joué'), I('Dormir', 'parce que j’ai mal dormi'), I('École', 'parce que la journée d’école était longue'),
    I('Sport', 'parce que j’ai fait du sport'), I('Nager', 'parce que j’ai nagé'), I('Malade', 'parce que je suis malade'), END] };
  const becScared = { title: 'Pourquoi j’ai peur ?', items: [
    I('Trop de bruit', 'parce qu’il y a trop de bruit'), I('Trop de monde', 'parce qu’il y a trop de monde'), I('Docteur', 'parce que je vais chez le docteur'),
    I('Toute seule', 'parce que je suis toute seule'), I('Ce soir', 'parce qu’il fait noir'), I('Parti', 'parce que papa est parti'),
    I('Je ne comprends pas', 'parce que je ne comprends pas'), END] };
  const becCalm = { title: 'Pourquoi je suis calme ?', items: [
    I('Musique', 'parce que j’écoute de la musique'), I('Doudou', 'parce que j’ai mon doudou'), I('Maison', 'parce que je suis à la maison'),
    I('Maman', 'parce que maman est là'), I('Papa', 'parce que papa est là'), I('Me reposer', 'parce que je me repose'), END] };

  /* ================= JE SUIS ================= */
  const suisItems = [
    I('Contente', 'contente', becHappy), I('Très contente', 'très contente', becHappy), I('Triste', 'triste', becSad),
    I('Énervée', 'énervée', becAngry), I('Calme', 'calme', becCalm), I('Fatiguée', 'fatiguée', becTired),
    I('Peur', 'j’ai peur', becScared, { replace: true }), I('Malade', 'malade'), I('Je suis mouillée', 'mouillée'),
    I('J’ai chaud', 'j’ai chaud', null, { replace: true }), I('J’ai froid', 'j’ai froid', null, { replace: true }),
    I('J’ai faim', 'j’ai faim', null, { replace: true }), I('J’ai soif', 'j’ai soif', null, { replace: true })];
  const suis = { title: 'Je suis…', items: suisItems };
  const suisCont = { title: 'Et aussi…', pre: 'et je suis', preReplace: 'et', items: suisItems };

  /* ================= JE VEUX ================= */
  const meals = { title: 'Je veux manger…', items: [
    I('Pâtes', 'des pâtes'), I('Pizza', 'de la pizza'), I('Frites', 'des frites'), I('Hamburger', 'un hamburger'), I('Couscous', 'du couscous'), I('Riz', 'du riz'),
    I('Viande', 'de la viande'), I('Poisson', 'du poisson'), I('Légumes', 'des légumes'), I('Soupe', 'de la soupe'),
    I('Pain', 'du pain'), I('Fromage', 'du fromage'), I('Yaourt', 'un yaourt'), I('Fruits', 'des fruits'), I('Pomme', 'une pomme'),
    I('Banane', 'une banane'), I('Gâteau', 'du gâteau'), I('Biscuit', 'un biscuit'), I('Chocolat', 'du chocolat'),
    I('Glace', 'une glace'), I('Bonbons', 'des bonbons')] };
  const drinks = { title: 'Je veux boire…', items: [I('Eau', 'de l’eau'), I('Jus', 'du jus'), I('Lait', 'du lait')] };
  /* après un aliment : on reste dans le monde de la nourriture */
  const foodMore = { title: 'Et après…', items: [] };
  const withFood = { title: 'Avec quoi ?', pre: 'avec', items: meals.items, cont: foodMore };
  const dessert = { title: 'En dessert…', items: ['Yaourt', 'Glace', 'Gâteau', 'Fruits', 'Pomme', 'Banane', 'Chocolat', 'Biscuit', 'Fromage']
    .map(n => meals.items.find(it => it.c && it.c.label === n)).filter(Boolean), cont: foodMore };
  const drinkMore = { title: 'Boire…', items: drinks.items, cont: foodMore };
  foodMore.items.push(
    I({ label: 'Avec…', emoji: '➕' }, '', withFood), I({ label: 'Dessert', emoji: '🍨' }, 'et en dessert', dessert),
    I('Boire', 'et boire', drinkMore), I('J’ai faim', 'parce que j’ai faim'),
    I('Restaurant', 'au restaurant'), I('Cantine', 'à la cantine'), I('Maison', 'à la maison'));
  foodMore.cont = foodMore; meals.cont = foodMore; drinks.cont = foodMore;

  /* ================= COMMANDE (comme une borne) : plat → sauce → boisson → dessert ================= */
  const RIEN = next => I({ label: 'Rien', emoji: '🚫' }, '', next);
  const SAY = {}; meals.items.concat(drinks.items).forEach(it => { if (it.c) SAY[it.c.label] = it.say; });
  const DESSERTS = ['Yaourt', 'Glace', 'Gâteau', 'Fruits', 'Pomme', 'Banane', 'Chocolat', 'Biscuit', 'Bonbons', 'Fromage'];
  const SAUCY = ['Frites', 'Hamburger', 'Pizza', 'Pâtes', 'Viande', 'Poisson', 'Riz', 'Pain', 'Légumes'];
  const cmdDessert = { title: '🍨 Le dessert ?', fini: true, items: ['Glace', 'Yaourt', 'Gâteau', 'Fruits', 'Chocolat'].map(n => I(n, 'et en dessert ' + SAY[n])).concat([I({ label: 'Rien', emoji: '🚫' }, '')]) };
  const cmdDrink = d => ({ title: '🥤 À boire ?', fini: true, items: ['Eau', 'Jus', 'Lait'].map(n => I(n, (d ? ', boire ' : 'et boire ') + SAY[n], d)).concat([RIEN(d)]) });
  const drinkThenDessert = cmdDrink(cmdDessert), drinkOnly = cmdDrink(null);
  drinkOnly.items.forEach(it => { it.next = undefined; });
  const cmdSauce = { title: '🍅 La sauce ?', fini: true, items: [
    I('Ketchup', 'avec du ketchup', drinkThenDessert), I('Mayonnaise', 'avec de la mayonnaise', drinkThenDessert),
    I({ label: 'Les deux', emoji: '🍅🥚' }, 'avec du ketchup et de la mayonnaise', drinkThenDessert), RIEN(drinkThenDessert)] };
  const cmdPlat = { title: 'Je veux manger…', items: meals.items.map(it => I(it.c.label, it.say,
    DESSERTS.includes(it.c.label) ? drinkOnly : SAUCY.includes(it.c.label) ? cmdSauce : drinkThenDessert)) };
  const cmdBoire = { title: 'Je veux boire…', items: drinks.items.map(it => I(it.c.label, it.say, cmdDessert)) };
  const sauceSolo = { title: 'Je veux…', items: [I('Ketchup', 'du ketchup'), I('Mayonnaise', 'de la mayonnaise')] };
  withFood.items = withFood.items.concat([I('Ketchup', 'du ketchup'), I('Mayonnaise', 'de la mayonnaise')]);
  const playWith = { title: 'Avec qui ? Où ?', items: [
    I('Papa', 'avec papa'), I('Maman', 'avec maman'), I('Copines', 'avec mes copines'), I('Yusuf', 'avec Yusuf'), I('Nayla', 'avec Nayla'),
    I('Mamie', 'avec mamie'), I('Papi', 'avec papi'), I('Toute seule', 'toute seule'),
    I('Jardin', 'dans le jardin'), I('Maison', 'à la maison'), I('Parc', 'au parc'), END] };
  const play = { title: 'Je veux jouer…', items: [
    I('Puzzle', 'au puzzle', playWith), I('Memory', 'au memory', playWith), I('Jeu des voitures', 'au jeu des voitures', playWith), I('Jeu des chiffres', 'au jeu des chiffres', playWith), I('Ballon', 'au ballon', playWith), I('iPad', 'à l’iPad', playWith),
    I('Jouer aux blocs', 'aux blocs', playWith), I('Mon robot', 'avec mon robot', playWith), I('Peluche', 'avec ma peluche', playWith),
    I('Doudou', 'avec mon doudou', playWith), I('Jardin', 'dans le jardin'), I('Parc', 'au parc'), I('Copines', 'avec mes copines'),
    I('Aire de jeux', 'dans l’aire de jeux'),
    I('Balançoire', 'faire de la balançoire', playWith, { replace: true }), I('Toboggan', 'faire du toboggan', playWith, { replace: true }),
    I('Nager', 'nager', playWith, { replace: true }), I('Vélo', 'faire du vélo', playWith, { replace: true }),
    I('Dessiner', 'dessiner', playWith, { replace: true }), I('Danser', 'danser', playWith, { replace: true }),
    I('Bulles', 'faire des bulles', playWith, { replace: true }), I('Lire', 'lire', playWith, { replace: true }),
    I('Musique', 'écouter de la musique', null, { replace: true }), I('Sport', 'faire du sport', playWith, { replace: true }),
    I('Construire', 'construire', playWith, { replace: true })] };
  const voir = { title: 'Je veux voir…', items: [
    I('Papa', 'papa'), I('Maman', 'maman'), I('Mamie', 'mamie'), I('Papi', 'papi'), I('Yusuf', 'Yusuf'), I('Nayla', 'Nayla'),
    I('Copines', 'mes copines'), I('Maîtresse', 'la maîtresse')] };
  const DEST = [['École', 'à l’école'], ['Piscine', 'à la piscine'], ['Parc', 'au parc'], ['Maison', 'à la maison'], ['Mamie', 'chez mamie'],
    ['Papi', 'chez papi'], ['Magasin', 'au magasin'], ['Docteur', 'chez le docteur'], ['Orthophoniste', 'chez l’orthophoniste'], ['Aire de jeux', 'à l’aire de jeux']];
  const transNode = (title) => ({ title, pre: 'pour aller', items: DEST.map(([c, s]) => I(c, s)).concat([END]) });
  const busTo = transNode('Le bus pour aller où ?'), carTo = transNode('La voiture pour aller où ?');
  const hugWho = { title: 'Un câlin à qui ?', items: [
    I('Papa', 'à papa'), I('Maman', 'à maman'), I('Mamie', 'à mamie'), I('Papi', 'à papi'), I('Yusuf', 'à Yusuf'),
    I('Nayla', 'à Nayla'), I('Copines', 'à mes copines'), I('Maîtresse', 'à la maîtresse'), I('Doudou', 'à mon doudou'), END] };
  const veuxItems = [
    I('Manger', 'manger', meals), I('Boire', 'boire', drinks), I(JOUER, 'jouer', play), I({ label: 'Voir…', emoji: '👀' }, 'voir', voir),
    I('Piscine', 'aller à la piscine'), I('Bus', 'prendre le bus', busTo), I('Parc', 'aller au parc'), I('Dehors', 'sortir dehors'), I('Télé', 'regarder la télé'),
    I('iPad', 'l’iPad'), I('Câlin', 'faire un câlin', hugWho), I('Dormir', 'dormir'), I('Bain', 'prendre mon bain'),
    I('Maison', 'rentrer à la maison'), I('Aide-moi', 'de l’aide'), I('Cadeau', 'un cadeau'),
    I('Glace', 'une glace'), I('Chocolat', 'du chocolat'), I('Puzzle', 'faire un puzzle'), I('Récréation', 'aller à la récréation'),
    I('Mamie', 'aller chez mamie'), I('Papi', 'aller chez papi'), I('Restaurant', 'aller au restaurant'), I('Dessiner', 'dessiner'), I('Musique', 'écouter de la musique')];
  const veux = { title: 'Je veux…', items: veuxItems };
  const veuxCont = { title: 'Et je veux aussi…', pre: 'et je veux', items: veuxItems };

  /* ================= JE VAIS … POUR … ================= */
  const MAM = I('M’amuser', 'm’amuser');
  const ACTS = [];
  const act = (title, items, pre) => { const n = { title, pre: pre || 'pour', items: items.map(it => ({ ...it })).concat([END]) }; ACTS.push(n); return n; };
  const ecoleAct = act('À l’école, pour…', [
    I('Récréation', 'jouer à la récréation'), I('Piscine', 'aller à la piscine'), I('Nager', 'nager à la piscine'), I('Dessiner', 'faire un dessin'), I('Maîtresse', 'voir la maîtresse'), I('Mon AESH', 'travailler avec mon AESH'),
    I('Lire', 'lire'), I('Cantine', 'manger à la cantine'), I('En classe', 'travailler en classe'), I('Puzzle', 'faire un puzzle'),
    I('Sport', 'faire du sport'), I('Musique', 'écouter de la musique'), I('Danser', 'danser'), I('Jouer aux blocs', 'jouer aux blocs')]);
  const parcAct = act('Là-bas, pour…', [
    MAM, I('Balançoire', 'faire de la balançoire'), I('Toboggan', 'faire du toboggan'), I('Ballon', 'jouer au ballon'), I('Vélo', 'faire du vélo'),
    I('Bulles', 'faire des bulles'), I('Sport', 'faire du sport')]);
  const piscAct = act('À la piscine, pour…', [
    I('Nager', 'nager'), MAM, I('Toboggan', 'faire du toboggan'), I('Jouer', 'jouer')]);
  const maisonAct = act('À la maison, pour…', [
    I(JOUER, 'jouer'), I('Manger', 'manger'), I('Dormir', 'dormir'),
    I('iPad', 'jouer à l’iPad'), I('Télé', 'regarder la télé'), I('Lire', 'lire'), I('Dessiner', 'dessiner'), I('Puzzle', 'faire un puzzle'),
    I('Me reposer', 'me reposer'), I('Bain', 'prendre mon bain')]);
  const famAct = act('Là-bas, pour…', [
    MAM, I('Manger', 'manger'), I(JOUER, 'jouer'), I('Un câlin', 'faire un câlin'), I('Dormir', 'dormir'), I('Gâteau', 'manger du gâteau'),
    I('Jardin', 'jouer dans le jardin')]);
  const magAct = act('Au magasin, pour acheter…', [
    I('Pain', 'du pain'), I('Fruits', 'des fruits'), I('Gâteau', 'un gâteau'), I('Cadeau', 'un cadeau'), I('Chocolat', 'du chocolat'),
    I('Bonbons', 'des bonbons'), I('Lait', 'du lait'), I('Yaourt', 'des yaourts'), I({ label: 'Des aliments', emoji: '🛒' }, 'des aliments'),
    I({ label: 'Habits', emoji: '👗' }, 'des habits'), I({ label: 'Un jouet', emoji: '🧸' }, 'un jouet')], 'pour acheter');
  const restoAct = act('Au restaurant, pour manger…', meals.items, 'pour manger');
  const cantAct = act('À la cantine, pour manger…', meals.items, 'pour manger');
  const docAct = act('Chez le docteur, parce que…', [
    I('Malade', 'je suis malade'), I('J’ai mal au ventre', 'j’ai mal au ventre'), I('J’ai mal à la tête', 'j’ai mal à la tête'),
    I('Oreille', 'j’ai mal à l’oreille'), I('Dents', 'j’ai mal aux dents')], 'parce que');
  const orthoAct = act('Chez l’orthophoniste, pour…', [
    I('Memory', 'jouer au memory'), I('Jeu des voitures', 'jouer au jeu des voitures'), I('Jeu des chiffres', 'jouer au jeu des chiffres'),
    I('Mon classeur', 'travailler avec mon classeur'), I('Je raconte', 'apprendre à parler'), I('Lire', 'lire une histoire'), I('Dessiner', 'dessiner')]);
  const how = act => ({ title: 'Comment j’y vais ?', items: [
    I('Bus', 'en bus', act), I('Voiture', 'en voiture', act), I('À pied', 'à pied', act), I({ label: 'Passer', emoji: '⏭️' }, '', act)] });
  const psyAct = act('Chez la psychomotricienne, pour…', [
    I({ label: 'Le pont', emoji: '🌉' }, 'marcher sur le pont'), I({ label: 'Équilibre', emoji: '🤸‍♀️' }, 'faire de l’équilibre'), I({ label: 'Sauter', emoji: '🦘' }, 'sauter'),
    I({ label: 'Grimper', emoji: '🧗‍♀️' }, 'grimper'), I('Ballon', 'jouer au ballon'), I(JOUER, 'jouer')]);
  const vaisItems = [
    I({ label: 'Psychomotricienne', emoji: '🤸‍♀️' }, 'chez la psychomotricienne', how(psyAct)),
    I('École', 'à l’école', how(ecoleAct)), I('Maison', 'à la maison', how(maisonAct)), I('Parc', 'au parc', how(parcAct)), I('Piscine', 'à la piscine', how(piscAct)),
    I('Magasin', 'au magasin', how(magAct)), I('Restaurant', 'au restaurant', how(restoAct)), I('Jardin', 'dans le jardin', parcAct), I('Aire de jeux', 'à l’aire de jeux', how(parcAct)),
    I('Dehors', 'dehors', parcAct), I('Cantine', 'à la cantine', cantAct), I('Mamie', 'chez mamie', how(famAct)), I('Papi', 'chez papi', how(famAct)),
    I('Docteur', 'chez le docteur', how(docAct)), I('Orthophoniste', 'chez l’orthophoniste', how(orthoAct)), I('Bus', 'prendre le bus', busTo), I('Voiture', 'partir en voiture', carTo), I('Bain', 'prendre mon bain'), I('Dormir', 'dormir'), I('Toilettes', 'aux toilettes')];
  const vais = { title: 'Je vais…', items: vaisItems };
  const vaisCont = { title: 'Et après, je vais…', pre: 'et après, je vais', items: vaisItems };
  vaisCont.items = vaisItems.concat([I(JOUER, 'jouer'), I('Dessiner', 'faire un dessin'), I('Manger', 'manger'), I('Copines', 'voir mes copines'),
    I('Papa', 'voir papa'), I('Maman', 'voir maman'), I('Télé', 'regarder la télé'), I('iPad', 'jouer à l’iPad')]);
  /* où → comment → pour quoi → AVEC QUI → et après (seulement ce qui va avec) */
  const withWho = { title: 'Qui m’accompagne ?', items: [
    I('Papa', 'avec papa'), I('Maman', 'avec maman'), I('Yusuf', 'avec Yusuf'), I('Nayla', 'avec Nayla'), I('Mamie', 'avec mamie'), I('Papi', 'avec papi'),
    I('Copines', 'avec mes copines'), I('Maîtresse', 'avec la maîtresse'), I('Mon AESH', 'avec mon AESH'), I({ label: 'Toute la famille', image: 'assets/cards/famille_tous.webp', style: 'photo' }, 'avec toute la famille'),
    I({ label: 'Toute seule', emoji: '🙋‍♀️' }, 'toute seule'), I({ label: 'Passer', emoji: '⏭️' }, '')] };
  /* plusieurs personnes : « avec Yusuf et Nayla et papa » */
  const PEOPLE = [['Papa', 'papa'], ['Maman', 'maman'], ['Yusuf', 'Yusuf'], ['Nayla', 'Nayla'], ['Mamie', 'mamie'], ['Papi', 'papi'], ['Copines', 'mes copines'], ['Maîtresse', 'la maîtresse'], ['Mon AESH', 'mon AESH']];
  const whoMore = { title: 'Et qui encore ?', hideUsed: true, items: [] };
  whoMore.items = PEOPLE.map(([c, s]) => I(c, 'et ' + s, whoMore)).concat([END]);
  withWho.items.forEach(it => { if (it.say && it.say.startsWith('avec ') && it.say !== 'avec toute la famille') it.next = whoMore; });
  playWith.items.forEach(it => { if (/^avec (papa|maman|mes copines|Yusuf|Nayla|mamie|papi)$/.test(it.say)) it.next = whoMore; });
  ACTS.forEach(n => { n.items.forEach(it => { if (it !== END && !it.next && !/avec (papa|maman|mes copines|Yusuf|Nayla|mamie|papi|la maîtresse|mon AESH)/i.test(it.say)) it.next = withWho; }); });
  const vaisAfter = { title: 'Et après, je vais…', items: vaisItems };
  vaisCont.title = 'Et après…'; delete vaisCont.pre;
  /* et après… : toutes les images comme au début, la journée continue */
  const footTo = transNode('À pied pour aller où ?');
  vaisCont.items = vaisItems.filter(it => it.c && !['Bus', 'Voiture', 'Bain', 'Dormir', 'Toilettes'].includes(it.c.label))
    .map(it => ({ ...it, say: 'et après, je vais ' + it.say }))
    .concat([I('Bus', 'et après, je reprends le bus', busTo), I('Voiture', 'et après, je reprends la voiture', carTo), I('À pied', 'et après, je rentre à pied', footTo),
      I('Dormir', 'et après, je vais dormir'), I('Contente', 'et je suis contente', becHappy), I('Triste', 'mais je suis triste', becSad), END]);
  withWho.cont = vaisCont; whoMore.cont = vaisCont;
  /* plusieurs jeux chez l'orthophoniste : « jouer au memory et au jeu des voitures » */
  const ORTHO_GAMES = [['Memory', 'au memory'], ['Jeu des voitures', 'au jeu des voitures'], ['Jeu des chiffres', 'au jeu des chiffres'], ['Puzzle', 'au puzzle']];
  const gameMore = { title: 'Et quoi encore ?', hideUsed: true, items: [] };
  gameMore.items = ORTHO_GAMES.map(([c, s]) => I(c, 'et ' + s, gameMore)).concat([I({ label: 'Continuer', emoji: '➡️' }, '', withWho)]);
  orthoAct.items.forEach(it => { if (/^jouer au /.test(it.say)) it.next = gameMore; });
  ACTS.forEach(n => { n.cont = vaisCont; });

  /* ================= JE RACONTE (quand, où, avec qui, quoi, comment, pourquoi) ================= */
  const becPast = { title: 'Pourquoi ?', items: [
    I('C’était bien', 'parce que c’était bien'), I('Ce n’était pas bien', 'parce que ce n’était pas bien'),
    I('Copines', 'parce que j’ai joué avec mes copines'), I('Papa', 'parce que papa était là'), I('Maman', 'parce que maman était là'),
    I('Cadeau', 'parce que j’ai eu un cadeau'), I('Trop de bruit', 'parce qu’il y avait trop de bruit'), I('Trop de monde', 'parce qu’il y avait trop de monde'),
    I('On m’embête', 'parce qu’on m’a embêtée'), I('Parti', 'parce que papa est parti'), I('Fatiguée', 'parce que j’étais fatiguée'), END] };
  const feelPast = { title: 'Comment j’étais ?', pre: 'et', items: [
    I('Contente', 'j’étais contente', becPast), I('Très contente', 'j’étais très contente', becPast), I('Triste', 'j’étais triste', becPast),
    I('Énervée', 'j’étais énervée', becPast), I('Calme', 'j’étais calme', becPast), I('Fatiguée', 'j’étais fatiguée', becPast),
    I('Peur', 'j’avais peur', becPast), END] };
  const didItems = [
    I('Nager', 'j’ai nagé', feelPast), I(JOUER, 'j’ai joué', feelPast), I('Ballon', 'j’ai joué au ballon', feelPast),
    I('Balançoire', 'j’ai fait de la balançoire', feelPast), I('Toboggan', 'j’ai fait du toboggan', feelPast), I('Vélo', 'j’ai fait du vélo', feelPast),
    I('Récréation', 'j’ai joué à la récréation', feelPast), I('Dessiner', 'j’ai dessiné', feelPast), I('Lire', 'j’ai lu', feelPast),
    I('Danser', 'j’ai dansé', feelPast), I('Musique', 'j’ai écouté de la musique', feelPast), I('Puzzle', 'j’ai fait un puzzle', feelPast),
    I('Sport', 'j’ai fait du sport', feelPast), I('En classe', 'j’ai travaillé en classe', feelPast), I('Manger', 'j’ai mangé', feelPast),
    I('Cantine', 'j’ai mangé à la cantine', feelPast), I('Gâteau', 'j’ai mangé du gâteau', feelPast), I('Glace', 'j’ai mangé une glace', feelPast),
    I('iPad', 'j’ai joué à l’iPad', feelPast), I('Télé', 'j’ai regardé la télé', feelPast), I('Cadeau', 'j’ai eu un cadeau', feelPast),
    I('Anniversaire', 'on a fêté un anniversaire', feelPast), I('Un câlin', 'j’ai fait un câlin', feelPast), I('Bain', 'j’ai pris mon bain', feelPast),
    I('Dormir', 'j’ai dormi', feelPast), I('Triste', 'j’ai pleuré', feelPast), I('Magasin', 'j’ai fait les courses', feelPast), I('Orthophoniste', 'j’ai travaillé avec l’orthophoniste', feelPast)];
  const did = { title: 'Qu’est-ce que j’ai fait ?', pre: ',', items: didItems };
  const didCont = { title: 'Et après, qu’est-ce que j’ai fait ?', pre: 'et après,', items: didItems };
  /* ---- ma journée d'école (gardée) ---- */
  const feelSchool = { title: 'Et comment j’étais ?', pre: 'et', items: feelPast.items };
  const school = { title: 'À l’école, qu’est-ce que j’ai fait ?', items: [
    I('Récréation', 'j’ai joué à la récréation', feelSchool), I('Piscine', 'je suis allée à la piscine avec la classe', feelSchool), I('Nager', 'j’ai nagé à la piscine', feelSchool), I('Copines', 'j’ai joué avec mes copines', feelSchool),
    I('Dessiner', 'j’ai dessiné', feelSchool), I('Lire', 'j’ai lu', feelSchool), I('Danser', 'j’ai dansé', feelSchool),
    I('Cantine', 'j’ai mangé à la cantine', feelSchool), I('En classe', 'j’ai travaillé en classe', feelSchool), I('Puzzle', 'j’ai fait un puzzle', feelSchool),
    I('Sport', 'j’ai fait du sport', feelSchool), I('Musique', 'j’ai écouté de la musique', feelSchool), I('Maîtresse', 'j’ai vu la maîtresse', feelSchool),
    I('Triste', 'j’ai pleuré', feelSchool)] };
  const schoolCont = { title: 'Et après, qu’est-ce que j’ai fait ?', pre: 'et après,', items: school.items };

  /* Je raconte, dans l'ordre d'une vraie phrase :
     Quand → Comment (voiture, bus, à pied) → Avec qui (plusieurs) → Où → Qu'est-ce que j'ai fait (selon l'endroit) → Comment j'étais
     « Aujourd'hui, je suis partie en voiture avec maman chez la psychomotricienne. J'ai marché sur le pont et j'étais contente. » */
  const PSY = { label: 'Psychomotricienne', emoji: '🤸‍♀️' };
  const pastAct = (title, items) => ({ title, pre: '.', items: items.map(([c, s]) => I(c, s, feelPast)) });
  const psyDid = pastAct('Chez la psychomotricienne, qu’est-ce que j’ai fait ?', [
    [{ label: 'Le pont', emoji: '🌉' }, 'j’ai marché sur le pont'], [{ label: 'Équilibre', emoji: '🤸‍♀️' }, 'j’ai fait de l’équilibre'],
    [{ label: 'Sauter', emoji: '🦘' }, 'j’ai sauté'], [{ label: 'Grimper', emoji: '🧗‍♀️' }, 'j’ai grimpé'],
    ['Ballon', 'j’ai joué au ballon'], ['Puzzle', 'j’ai fait un puzzle'], ['Dessiner', 'j’ai dessiné'], [JOUER, 'j’ai joué']]);
  const schoolDid = { title: 'À l’école, qu’est-ce que j’ai fait ?', pre: '.', items: school.items };
  const parcDid = pastAct('Au parc, qu’est-ce que j’ai fait ?', [
    ['Balançoire', 'j’ai fait de la balançoire'], ['Toboggan', 'j’ai fait du toboggan'], ['Ballon', 'j’ai joué au ballon'], ['Vélo', 'j’ai fait du vélo'],
    [{ label: 'Courir', emoji: '🏃‍♀️' }, 'j’ai couru'], ['Copines', 'j’ai joué avec mes copines'], ['Glace', 'j’ai mangé une glace'], [JOUER, 'j’ai joué']]);
  const piscDid = pastAct('À la piscine, qu’est-ce que j’ai fait ?', [
    ['Nager', 'j’ai nagé'], [JOUER, 'j’ai joué dans l’eau'], ['Toboggan', 'j’ai fait du toboggan']]);
  const famDid = pastAct('Qu’est-ce que j’ai fait ?', [
    [JOUER, 'j’ai joué'], ['Manger', 'j’ai mangé'], ['Gâteau', 'j’ai mangé du gâteau'], ['Télé', 'j’ai regardé la télé'], ['iPad', 'j’ai joué à l’iPad'],
    ['Dessiner', 'j’ai dessiné'], ['Un câlin', 'j’ai fait un câlin'], ['Cadeau', 'j’ai eu un cadeau']]);
  const magDid = pastAct('Au magasin, qu’est-ce que j’ai fait ?', [
    ['Magasin', 'j’ai fait les courses'], ['Cadeau', 'j’ai eu un cadeau'], ['Bonbons', 'j’ai eu des bonbons'], ['Gâteau', 'j’ai eu un gâteau'], ['Glace', 'j’ai eu une glace']]);
  const docDid = pastAct('Chez le docteur…', [
    ['Malade', 'j’étais malade'], ['J’ai mal au ventre', 'j’avais mal au ventre'], ['J’ai mal à la tête', 'j’avais mal à la tête'],
    ['Oreille', 'j’avais mal à l’oreille'], ['Dents', 'j’avais mal aux dents'], ['Gorge', 'j’avais mal à la gorge']]);
  const orthoDid = pastAct('Chez l’orthophoniste, qu’est-ce que j’ai fait ?', [
    ['Memory', 'j’ai joué au memory'], ['Jeu des voitures', 'j’ai joué au jeu des voitures'], ['Jeu des chiffres', 'j’ai joué au jeu des chiffres'],
    ['Mon classeur', 'j’ai travaillé avec mon classeur'], ['Je raconte', 'j’ai appris à parler'], ['Lire', 'j’ai lu une histoire'], ['Dessiner', 'j’ai dessiné']]);
  const gameMorePast = { title: 'Et quoi encore ?', hideUsed: true, items: ORTHO_GAMES.map(([c, s]) => I(c, 'et ' + s)) };
  gameMorePast.items.forEach(it => { it.next = gameMorePast; });
  gameMorePast.items.push(I({ label: 'Continuer', emoji: '➡️' }, '', feelPast));
  orthoDid.items.forEach(it => { if (/^j’ai joué au /.test(it.say)) it.next = gameMorePast; });
  const restoDid = pastAct('Au restaurant, qu’est-ce que j’ai mangé ?', [
    ['Pizza', 'j’ai mangé de la pizza'], ['Frites', 'j’ai mangé des frites'], ['Pâtes', 'j’ai mangé des pâtes'], ['Viande', 'j’ai mangé de la viande'],
    ['Glace', 'j’ai mangé une glace'], ['Gâteau', 'j’ai mangé du gâteau'], ['Manger', 'j’ai mangé']]);
  const didDot = { title: 'Qu’est-ce que j’ai fait ?', pre: '.', items: didItems };
  /* Où ? — v = '' après « je suis partie en voiture », v = 'je suis allée' si on a passé « Comment » */
  const pastWhere = v => {
    const P = (c, s, next) => I(c, (v ? v + ' ' : '') + s, next);
    return { title: 'Où ?', items: [
      P(PSY, 'chez la psychomotricienne', psyDid), P('École', 'à l’école', schoolDid), P('Parc', 'au parc', parcDid), P('Piscine', 'à la piscine', piscDid),
      P('Mamie', 'chez mamie', famDid), P('Papi', 'chez papi', famDid), P('Orthophoniste', 'chez l’orthophoniste', orthoDid), P('Docteur', 'chez le docteur', docDid),
      P('Magasin', 'au magasin', magDid), P('Restaurant', 'au restaurant', restoDid), P('Aire de jeux', 'à l’aire de jeux', parcDid), P('Maison', 'à la maison', didDot),
      I({ label: 'Passer', emoji: '⏭️' }, '', v ? did : didDot)] };
  };
  /* Avec qui ? — on peut choisir plusieurs personnes, puis ➡️ pour continuer */
  const pastWho = next => {
    const GO = I({ label: 'Continuer', emoji: '➡️' }, '', next);
    const more = { title: 'Et qui encore ?', hideUsed: true, items: [] };
    const ppl = [['Papa', 'papa'], ['Maman', 'maman'], ['Yusuf', 'Yusuf'], ['Nayla', 'Nayla'], ['Mamie', 'mamie'], ['Papi', 'papi'], ['Copines', 'mes copines']];
    more.items = ppl.map(([c, s]) => I(c, 'et ' + s, more)).concat([GO]);
    return { title: 'Avec qui ?', items: ppl.map(([c, s]) => I(c, 'avec ' + s, more)).concat([
      I({ label: 'Toute la famille', image: 'assets/cards/famille_tous.webp', style: 'photo' }, 'avec toute la famille', next),
      I('Maîtresse', 'avec la maîtresse', next), I('Mon AESH', 'avec mon AESH', next),
      I({ label: 'Toute seule', emoji: '🙋‍♀️' }, 'toute seule', next), I({ label: 'Passer', emoji: '⏭️' }, '', next)]) };
  };
  const whereGo = pastWhere(''), whereVerb = pastWhere(', je suis allée');
  const whoGo = pastWho(whereGo), whoVerb = pastWho(whereVerb), whoHome = pastWho(didDot);
  const pastHowFirst = { title: 'Comment je suis partie ?', items: [
    I('Voiture', 'je suis partie en voiture', whoGo), I('Bus', 'je suis partie en bus', whoGo), I('À pied', 'je suis partie à pied', whoGo),
    I('Maison', 'je suis restée à la maison', whoHome), I({ label: 'Passer', emoji: '⏭️' }, '', whoVerb)] };
  const where = pastHowFirst;
  const when = { title: 'Quand ?', items: [
    I('Aujourd’hui', 'aujourd’hui,', where, { replace: true }), I('Hier', 'hier,', where, { replace: true }),
    I('Ce matin', 'ce matin,', where, { replace: true }), I('Cet après-midi', 'cet après-midi,', where, { replace: true }),
    I('Ce soir', 'ce soir,', where, { replace: true }), I('Ce week-end', 'ce week-end,', where, { replace: true })] };


  /* ================= MA JOURNÉE D'ÉCOLE : toute la journée, dans l'ordre =================
     arrivée → classe du matin → récréation → midi à la maison (menu) → retour à l'école → classe de l'après-midi → récréation → le soir */
  const GO = next => I({ label: 'Continuer', emoji: '➡️' }, '', next);
  const PASS = next => I({ label: 'Passer', emoji: '⏭️' }, '', next);
  const DAY_PPL = [['Maman', 'maman'], ['Papa', 'papa'], ['Mamie', 'mamie'], ['Papi', 'papi'], ['Yusuf', 'Yusuf'], ['Nayla', 'Nayla'], ['Copines', 'mes copines']];
  /* plusieurs choix : le 1er choix, puis « et … » jusqu'à ➡️ Continuer */
  const multi = (title, pre, list, next, moreTitle) => {
    const more = { title: moreTitle || 'Et quoi encore ?', hideUsed: true, items: [] };
    more.items = list.map(([c, s]) => I(c, 'et ' + s, more)).concat([GO(next)]);
    return { title, pre, items: list.map(([c, s]) => I(c, s, more)).concat([PASS(next)]) };
  };
  const dayWho = next => {
    const more = { title: 'Et avec qui encore ?', hideUsed: true, items: [] };
    more.items = DAY_PPL.map(([c, s]) => I(c, 'et ' + s, more)).concat([GO(next)]);
    return { title: 'Avec qui ?', items: DAY_PPL.map(([c, s]) => I(c, 'avec ' + s, more)).concat([
      I({ label: 'Toute seule', emoji: '🙋‍♀️' }, 'toute seule', next), PASS(next)]) };
  };
  const travel = (title, pre, next) => ({ title, pre, items: [
    I('Bus', 'en bus', dayWho(next)), I('Voiture', 'en voiture', dayWho(next)), I('À pied', 'à pied', dayWho(next)), PASS(dayWho(next))] });
  const ULIS = { label: 'Classe ULIS', emoji: '🏫' };
  const CLASS = [[ULIS, 'j’ai travaillé en ULIS'], ['En classe', 'j’ai travaillé'], ['Lire', 'j’ai lu'], ['Dessiner', 'j’ai dessiné'], ['Puzzle', 'j’ai fait un puzzle'],
    ['Musique', 'j’ai fait de la musique'], ['Danser', 'j’ai dansé'], ['Jouer aux blocs', 'j’ai joué aux blocs'], ['Construire', 'j’ai construit'], ['iPad', 'j’ai utilisé l’iPad'],
    ['Maîtresse', 'j’ai travaillé avec la maîtresse'], ['Copines', 'j’ai travaillé avec mes copines']];
  const CLASS_PM = CLASS.concat([['Sport', 'j’ai fait du sport'], ['Piscine', 'je suis allée à la piscine'], ['Nager', 'j’ai nagé']]);
  const GAMES = [[{ label: 'Corde à sauter', emoji: '🪢' }, 'à la corde à sauter'], ['Toboggan', 'au toboggan'], ['Balançoire', 'à la balançoire'],
    ['Ballon', 'au ballon'], [{ label: 'Cache-cache', emoji: '🙈' }, 'à cache-cache'], [{ label: 'Courir', emoji: '🏃‍♀️' }, 'à la course'],
    [{ label: 'Le loup', emoji: '🐺' }, 'au loup'], ['Bulles', 'aux bulles']];
  const recre = (next, label) => {
    const games = multi('À quoi j’ai joué ?', '', GAMES, next, 'À quoi encore ?');
    return { title: '🛝 ' + label + ' : avec qui j’ai joué ?', pre: '. ' + label.toLowerCase() + ',', items: [
      I('Copines', 'j’ai joué avec mes copines', games), I({ label: 'Toute seule', emoji: '🙋‍♀️' }, 'j’ai joué toute seule', games),
      I('Maîtresse', 'j’ai joué avec la maîtresse', games), I(JOUER, 'j’ai joué', games), PASS(next)] };
  };
  /* le soir, à la maison : comment j'étais ? → POURQUOI ? → et encore ? */
  const WHY_GOOD = [['C’était bien', 'c’était bien'], [JOUER, 'j’ai joué'], ['Copines', 'j’ai joué avec mes copines'], ['Toboggan', 'j’ai fait du toboggan'],
    ['Maîtresse', 'la maîtresse était gentille'], ['Manger', 'j’ai bien mangé'], ['Maman', 'j’ai vu maman'], ['Papa', 'j’ai vu papa'], ['Cadeau', 'j’ai eu un cadeau']];
  const WHY_BAD = [['Trop de bruit', 'il y avait trop de bruit'], ['Trop de monde', 'il y avait trop de monde'], ['On m’embête', 'on m’a embêtée'],
    ['Toute seule', 'j’étais toute seule'], ['J’ai mal au ventre', 'j’avais mal'], ['Malade', 'j’étais malade'], ['Copines', 'mes copines n’étaient pas là'],
    ['Ce n’était pas bien', 'ce n’était pas bien'], ['Je ne comprends pas', 'je n’ai pas compris']];
  const WHY_TIRED = [[JOUER, 'j’ai beaucoup joué'], ['En classe', 'j’ai beaucoup travaillé'], ['École', 'la journée était longue'], ['Dormir', 'j’ai mal dormi'],
    ['Trop de bruit', 'il y avait trop de bruit']];
  const feelMore = { title: 'Et encore ?', items: [] };
  const why = (title, list) => ({ title: 'Pourquoi ' + title + ' ?', pre: 'parce que', items: list.map(([c, s]) => I(c, s, feelMore)).concat([PASS(feelMore)]) });
  const EMO = [
    ['Contente', 'j’étais contente', why('j’étais contente', WHY_GOOD)], ['Très contente', 'j’étais très contente', why('j’étais très contente', WHY_GOOD)],
    [{ label: 'Bonne journée', emoji: '🌟' }, 'j’ai passé une bonne journée', why('c’était une bonne journée', WHY_GOOD)],
    ['Fatiguée', 'j’étais fatiguée', why('j’étais fatiguée', WHY_TIRED)], ['Calme', 'j’étais calme', null],
    [{ label: 'Pas contente', emoji: '😞' }, 'je n’étais pas contente', why('je n’étais pas contente', WHY_BAD)],
    ['Triste', 'j’étais triste', why('j’étais triste', WHY_BAD)], ['Énervée', 'j’étais énervée', why('j’étais énervée', WHY_BAD)],
    ['Peur', 'j’ai eu peur', why('j’ai eu peur', WHY_BAD)]];
  feelMore.items = EMO.map(([c, s, n]) => I(c, 'et ' + s, n || feelMore)).concat([I({ label: 'C’est tout', emoji: '✅' }, '')]);
  feelMore.hideUsed = true;
  const endFeel = { title: '🏠 À la maison, comment j’étais ?', pre: '.', items: EMO.map(([c, s, n]) => I(c, s, n || feelMore)).concat([I({ label: 'C’est tout', emoji: '✅' }, '')]) };
  /* LA JOURNÉE, dans l'ordre */
  const evening = travel('🌙 Le soir, comment je suis rentrée à la maison ?', '. le soir, je suis rentrée à la maison', endFeel);
  const pmClass2 = multi('🏫 Après la récré, en classe, qu’est-ce que j’ai fait ?', '. après la récréation,', CLASS_PM, evening);
  const recreA = recre(pmClass2, 'À la récréation de l’après-midi');
  const pmClass = multi('🏫 L’après-midi, en classe, qu’est-ce que j’ai fait ?', '. l’après-midi, en classe,', CLASS_PM, recreA);
  const backSchool = travel('🚌 Comment je suis retournée à l’école ?', '. ensuite, je suis retournée à l’école', pmClass);
  const homeAct = multi('🏠 Avant de repartir, qu’est-ce que j’ai fait à la maison ?', '. après,', [
    ['Télé', 'j’ai regardé la télé'], ['iPad', 'j’ai joué à l’iPad'], [JOUER, 'j’ai joué'], ['Yusuf', 'j’ai joué avec Yusuf'], ['Nayla', 'j’ai joué avec Nayla'],
    ['Dessiner', 'j’ai dessiné'], ['Puzzle', 'j’ai fait un puzzle'], ['Me reposer', 'je me suis reposée'], ['Un câlin', 'j’ai fait un câlin']], backSchool);
  const DESS = ['Yaourt', 'Glace', 'Gâteau', 'Fruits', 'Pomme', 'Banane', 'Chocolat', 'Biscuit', 'Fromage'];
  const dessertL = { title: '🍨 Le dessert ?', pre: '. en dessert, j’ai mangé', items: DESS.map(n => I(n, SAY[n], homeAct)).concat([I({ label: 'Rien', emoji: '🚫' }, '', homeAct)]) };
  const drinkL = { title: '🥤 Qu’est-ce que j’ai bu ?', pre: '. j’ai bu', items: ['Eau', 'Jus', 'Lait'].map(n => I(n, SAY[n], dessertL)).concat([I({ label: 'Rien', emoji: '🚫' }, '', dessertL)]) };
  const MAINS = meals.items.filter(it => it.c && !DESSERTS.includes(it.c.label)).map(it => [it.c.label, it.say]);
  const lunch = multi('🍽️ À midi, qu’est-ce que j’ai mangé ?', '. j’ai mangé', MAINS, drinkL);
  const noon = travel('🚌 À midi, comment je suis rentrée à la maison ?', '. à midi, je suis rentrée à la maison', lunch);
  const amClass2 = multi('🏫 Après la récré, en classe, qu’est-ce que j’ai fait ?', '. après la récréation,', CLASS, noon);
  const recreM = recre(amClass2, 'À la récréation');
  const amClass = multi('🏫 Le matin, en classe, qu’est-ce que j’ai fait ?', '. le matin, en classe,', CLASS, recreM);
  const arrive = travel('🚌 Comment je suis allée à l’école ?', 'je suis allée à l’école', amClass);
  /* ================= JE DEMANDE (à qui, puis quoi) ================= */
  const ask = { title: 'Je demande…', items: [
    I('Bonjour', 'bonjour !'), I('Au revoir', 'au revoir !'), I('Merci', 'merci !'), I('Pardon', 'pardon !'), I('Bisou', 'tu me fais un bisou ?'), I('Tu viens ?', 'tu viens ?'), I('Tu joues avec moi ?', 'tu joues avec moi ?'), I('Regarde !', 'regarde !'),
    I('Aide-moi', 'aide-moi, s’il te plaît !'), I('S’il te plaît', 's’il te plaît !'), I('Fini', 'c’est fini ?'), I('Un câlin', 'tu me fais un câlin ?'), I('Parc', 'on va au parc ?'),
    I('Piscine', 'on va à la piscine ?'), I('Bus', 'on prend le bus ?'), I('Orthophoniste', 'on va chez l’orthophoniste ?'), I('Dehors', 'on sort dehors ?'), I('iPad', 'je peux avoir l’iPad ?'),
    I('Télé', 'je peux regarder la télé ?'), I('Lire', 'tu me lis une histoire ?'), I('Dessiner', 'on dessine ensemble ?'),
    I('Manger', 'on mange quand ?'), I('Où ?', 'on va où ?'), I('Quand ?', 'c’est quand ?'), I('Qui ?', 'qui vient ?'),
    I('Qu’est-ce qu’on fait ?', 'qu’est-ce qu’on fait ?'), I('Pourquoi ?', 'pourquoi ?')] };
  const askWho = { title: 'À qui je demande ?', items: [
    I('Papa', 'papa,', ask, { replace: true }), I('Maman', 'maman,', ask, { replace: true }), I('Mamie', 'mamie,', ask, { replace: true }),
    I('Papi', 'papi,', ask, { replace: true }), I('Yusuf', 'Yusuf,', ask, { replace: true }), I('Nayla', 'Nayla,', ask, { replace: true }),
    I('Maîtresse', 'maîtresse,', ask, { replace: true }), I('Mon AESH', 'madame,', ask, { replace: true }), I('Orthophoniste', 'madame,', ask, { replace: true }), I('Copines', 'les copines,', ask, { replace: true }),
    I('Tout le monde', 'tout le monde,', ask, { replace: true }), I({ label: 'Passer', emoji: '⏭️' }, '', ask, { replace: true })] };

  /* ================= J'AI MAL ================= */
  const malItems = [
    I('J’ai mal au ventre', 'au ventre'), I('J’ai mal à la tête', 'à la tête'), I('Dents', 'aux dents'), I('Gorge', 'à la gorge'),
    I('Oreille', 'à l’oreille'), I('Pied', 'au pied'), I('Main', 'à la main'), I('Yeux', 'aux yeux')];
  const mal = { title: 'J’ai mal…', items: malItems };
  const malCont = { title: 'Et j’ai mal aussi…', pre: 'et', items: malItems };

  const vaisFut = { title: 'Je vais…', items: vaisItems };
  const roots = [
    { key: 'ajd', label: 'Aujourd’hui, je vais…', pic: 'Aujourd’hui', word: { label: 'Aujourd’hui', say: 'aujourd’hui, je vais' }, node: vaisFut, cont: vaisCont },
    { key: 'demain', label: 'Demain, je vais…', pic: 'Demain', word: { label: 'Demain', say: 'demain, je vais' }, node: vaisFut, cont: vaisCont },
    { key: 'veux', label: 'Je veux…', pic: 'Je veux', big: true, word: { label: 'Je veux', say: 'je veux' }, node: veux, cont: veuxCont },
    { key: 'vais', label: 'Je vais…', pic: 'Sortir', big: true, hidden: true, word: { label: 'Je vais', say: 'je vais' }, node: vais, cont: vaisCont },
    { key: 'raconte', label: 'Je raconte', pic: 'Lire', big: true, word: { label: 'Je raconte', say: '' }, node: when, cont: didCont },
    { key: 'demande', label: 'Je demande', pic: 'Tu viens ?', big: true, word: { label: 'Je demande', say: '' }, node: askWho },
    { key: 'suis', label: 'Je suis…', pic: 'Contente', big: true, word: { label: 'Je suis', say: 'je suis' }, node: suis, cont: suisCont },
    { key: 'ecole', label: 'Ma journée d’école', pic: 'École', word: { label: 'Aujourd’hui', say: 'aujourd’hui,' }, node: arrive },
    { key: 'mal', label: 'J’ai mal…', pic: 'J’ai mal à la tête', word: { label: 'J’ai mal', say: 'j’ai mal' }, node: mal, cont: malCont },
  ];
  const jouerEns = { title: 'On joue à quoi ?', fini: true, items: [
    I('Puzzle', 'on joue au puzzle ?'), I('Ballon', 'on joue au ballon ?'), I('iPad', 'on joue à l’iPad ?'), I('Jouer aux blocs', 'on joue aux blocs ?'),
    I('Dessiner', 'on dessine ensemble ?'), I('Danser', 'on danse ensemble ?'), I('Jardin', 'on joue dans le jardin ?'), I({ label: 'Ensemble', emoji: '🤝' }, 'on joue ensemble ?')] };
  roots.push({ key: 'joue', hidden: true, label: 'Je joue…', pic: 'Puzzle', word: { label: 'Je veux jouer', say: 'je veux jouer' }, node: play, cont: veuxCont });
  roots.push({ key: 'jouerEns', hidden: true, label: 'On joue ?', pic: 'Puzzle', word: { label: 'On joue', say: '' }, node: jouerEns });
  roots.push(
    { key: 'repas', hidden: true, label: 'Je veux manger…', pic: 'Manger', word: { label: 'Je veux manger', say: 'je veux manger' }, node: cmdPlat, cont: foodMore },
    { key: 'repasBoire', hidden: true, label: 'Je veux boire…', pic: 'Boire', word: { label: 'Je veux boire', say: 'je veux boire' }, node: cmdBoire, cont: foodMore },
    { key: 'repasSauce', hidden: true, label: 'Je veux…', pic: 'Je veux', word: { label: 'Je veux', say: 'je veux' }, node: sauceSolo, cont: foodMore });
  return { roots, miss };
}
