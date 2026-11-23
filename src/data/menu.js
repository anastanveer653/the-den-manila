// The Den menu, taken from thedenmanila.com/menu.
//
// Each item:  { name, desc, serve?: ['Iced','Hot'], soy?: true, price?: 185 }
// The official site lists no prices, so `price` is left out. Add a number
// (in pesos) to any item and it shows up on the page automatically.

const BOTH = ['Iced', 'Hot'];
const HOT = ['Hot'];
const ICED = ['Iced'];

export const menu = [
  {
    id: 'special',
    label: 'Special Drinks',
    groups: [
      {
        title: 'Special Drinks',
        items: [
          { name: 'Berg’s', desc: 'Espresso, coconut milk blend, muscovado syrup.', serve: BOTH },
          { name: 'Dirty Chai', desc: 'Espresso, milk, handcrafted chai.', serve: BOTH },
          { name: 'Dirty Matcha', desc: 'Premium grade matcha, milk, espresso.', serve: BOTH },
          { name: 'Big Black Cup', desc: 'Espresso shots with fresh cold brew.', serve: ICED },
        ],
      },
    ],
  },
  {
    id: 'coffee',
    label: 'Coffee',
    groups: [
      {
        title: 'Coffee',
        items: [
          { name: 'Espresso', desc: 'Double shot of our great Philippine blend roasted by Escolta Coffee Company.', serve: HOT },
          { name: 'Americano', desc: 'Espresso shots with water.', serve: BOTH },
          { name: 'Cortado', desc: 'Espresso shots with an equal amount of steamed milk.', serve: HOT, soy: true },
          { name: 'Latte', desc: 'Espresso shots with milk.', serve: BOTH, soy: true },
          { name: 'Cappuccino', desc: 'Espresso shots with foamed milk.', serve: HOT, soy: true },
          { name: 'Mocha', desc: 'Espresso shots with milk and our signature chocolate.', serve: BOTH, soy: true },
          { name: 'Brown Sugar Latte', desc: 'Espresso shots with milk and our signature brown sugar sauce.', serve: BOTH, soy: true },
          { name: 'Caramel Latte', desc: 'Espresso shots with milk and caramel syrup.', serve: BOTH, soy: true },
          { name: 'Spanish Latte', desc: 'Espresso shots with sweetened milk. Creamy and sweet.', serve: BOTH, soy: true },
        ],
      },
    ],
  },
  {
    id: 'non-coffee',
    label: 'Non Coffee',
    groups: [
      {
        title: 'Non Coffee',
        items: [
          { name: 'Chocolate', desc: 'Our signature chocolate with milk.', serve: BOTH, soy: true },
          { name: 'Matcha', desc: 'Premium grade matcha and milk.', serve: BOTH, soy: true },
          { name: 'Chai', desc: 'Handcrafted chai with milk.', serve: BOTH, soy: true },
          { name: 'Tea', desc: 'Freshly brewed choice of tea: Roselle, Cascara, Thai.', serve: BOTH },
        ],
      },
    ],
  },
  {
    id: 'cold',
    label: 'Cold Brew & Soda',
    groups: [
      {
        title: 'Cold Brew',
        items: [
          { name: 'Cold Brew Black', desc: 'Cold brew and ice.', serve: ICED },
          { name: 'Cold Brew White', desc: 'Cold brew, milk and ice.', serve: ICED },
          { name: 'Cold Brew Sweet White', desc: 'Cold brew, sweetened milk and ice.', serve: ICED },
        ],
      },
      {
        title: 'Fresh Soda',
        items: [
          { name: 'Roselle Orange Soda', desc: 'Roselle tea with fresh orange slices and juice, topped with ice and sparkling water.', serve: ICED },
          { name: 'Chai Spice Orange Lemon Soda', desc: 'Handcrafted chai, fresh orange and lemon slices plus sparkling water and ice.', serve: ICED },
        ],
      },
    ],
  },
  {
    id: 'pasta',
    label: 'Fresh Pasta',
    groups: [
      {
        title: 'Fresh Pasta',
        items: [
          { name: 'Tinapa', desc: 'Our secret recipe tinapa sauce, pasta, topped with freshly grated parmesan.' },
          { name: 'Lemon, Capers, and Sardine', desc: 'Lemon zest, capers, sardine, pasta, topped with freshly grated parmesan.' },
          { name: 'Spicy Tuna', desc: 'Special recipe tomato sauce, tuna, olives, capers, pasta, topped with freshly grated parmesan.' },
          { name: 'Lemon Mushroom Cream', desc: 'Tangy mushroom cream sauce, mushrooms, lemon, topped with freshly grated parmesan.' },
          { name: 'Pesto', desc: 'We make our own pesto from scratch: basil leaves, parmesan cheese, walnuts, and olive oil.' },
          { name: 'No Meat Ragu', desc: 'Hearty no meat tomato ragu sauce made with mushrooms and diced tomatoes. Topped with freshly grated parmesan.' },
        ],
      },
    ],
  },
  {
    id: 'rice',
    label: 'Rice Bowls',
    groups: [
      {
        title: 'Rice Bowls',
        items: [
          { name: 'Lemon Chicken Rice Bowl', desc: 'Chicken tenders in our special crispy batter drizzled with lemon sauce.' },
          { name: 'Soy Ginger Tofu Mushroom Rice Bowl', desc: 'Tofu cubes, shiitake mushrooms and soy-ginger sauce.' },
          { name: 'Honey Garlic Spam', desc: 'Honey garlic sauce, Spam slices, and scrambled egg.' },
          { name: 'Adobo Rice Bowl', desc: 'Our special recipe adobo comes with hard boiled egg and garlic confit.' },
          { name: 'Beef Burger Steak', desc: 'Angus all beef patty, mushroom gravy made from scratch, and piping hot rice.' },
          { name: 'Pork Katsu Curry', desc: 'Crisp fried pork katsu with our special curry sauce and steaming hot rice.' },
        ],
      },
    ],
  },
  {
    id: 'bread',
    label: 'Sandwiches & Waffles',
    groups: [
      {
        title: 'Sandwiches',
        items: [
          { name: 'Grilled Cheese Sandwich', desc: 'Grilled cheese on croissant bread loaf slices. Served with tomato ragu dip.' },
          { name: 'Thicc Spam and Egg Sandwich', desc: 'Spam with egg on croissant bread loaf slices. Served with fries.' },
        ],
      },
      {
        title: 'Waffles',
        items: [
          { name: 'Banana Caramel Waffle', desc: 'Liège waffle with sliced bananas, almonds and whipped cream on top.' },
          { name: 'Choco Hazelnut Waffle', desc: 'Chocolate waffle with sliced almonds, hazelnut chocolate spread, and whipped cream on top.' },
        ],
      },
    ],
  },
];

// How each special drink is built, bottom layer first. Drives the glass illustrations.
// `part` is the share of the glass each layer takes.
export const signatures = [
  {
    name: 'Berg’s',
    note: 'It shares a name with Berg’s Department Store, the Escolta landmark that opened on this building’s ground floor in 1936.',
    layers: [
      { label: 'Muscovado syrup', color: '#8a4b1d', part: 1 },
      { label: 'Coconut milk blend', color: '#efe3cb', part: 3 },
      { label: 'Espresso', color: '#5a3119', part: 1.4 },
    ],
  },
  {
    name: 'Dirty Chai',
    note: 'Our handcrafted chai, cut with espresso and rounded out with milk.',
    layers: [
      { label: 'Handcrafted chai', color: '#b9773a', part: 1.6 },
      { label: 'Milk', color: '#f1e6d3', part: 2.4 },
      { label: 'Espresso', color: '#5a3119', part: 1.4 },
    ],
  },
  {
    name: 'Dirty Matcha',
    note: 'Matcha and espresso in the same glass, softened with milk.',
    layers: [
      { label: 'Premium grade matcha', color: '#7f9a4a', part: 1.8 },
      { label: 'Milk', color: '#f1e6d3', part: 2.2 },
      { label: 'Espresso', color: '#5a3119', part: 1.4 },
    ],
  },
  {
    name: 'Big Black Cup',
    note: 'Coffee on coffee: espresso shots poured into fresh cold brew. Iced only.',
    layers: [
      { label: 'Fresh cold brew', color: '#5c331b', part: 3.6 },
      { label: 'Espresso shots', color: '#2f190e', part: 1.8 },
    ],
  },
];

export const itemCount = menu.reduce(
  (n, cat) => n + cat.groups.reduce((m, g) => m + g.items.length, 0),
  0,
);
