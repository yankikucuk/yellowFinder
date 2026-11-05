/**
 * The 81 provinces of Turkey as sahibinden.com URL slugs.
 *
 * sahibinden.com builds search URLs as `/<category-slug>/<city-slug>`, so the
 * slug is the only thing the scanner needs. The label is what the user sees.
 *
 * @module shared/catalog/cities
 */

/**
 * @typedef {object} City
 * @property {string} slug URL segment used by sahibinden.com.
 * @property {string} label Human readable province name.
 */

/** @type {City[]} */
export const CITIES = [
  { slug: "adana", label: "Adana" },
  { slug: "adiyaman", label: "Adıyaman" },
  { slug: "afyonkarahisar", label: "Afyonkarahisar" },
  { slug: "agri", label: "Ağrı" },
  { slug: "aksaray", label: "Aksaray" },
  { slug: "amasya", label: "Amasya" },
  { slug: "ankara", label: "Ankara" },
  { slug: "antalya", label: "Antalya" },
  { slug: "ardahan", label: "Ardahan" },
  { slug: "artvin", label: "Artvin" },
  { slug: "aydin", label: "Aydın" },
  { slug: "balikesir", label: "Balıkesir" },
  { slug: "bartin", label: "Bartın" },
  { slug: "batman", label: "Batman" },
  { slug: "bayburt", label: "Bayburt" },
  { slug: "bilecik", label: "Bilecik" },
  { slug: "bingol", label: "Bingöl" },
  { slug: "bitlis", label: "Bitlis" },
  { slug: "bolu", label: "Bolu" },
  { slug: "burdur", label: "Burdur" },
  { slug: "bursa", label: "Bursa" },
  { slug: "canakkale", label: "Çanakkale" },
  { slug: "cankiri", label: "Çankırı" },
  { slug: "corum", label: "Çorum" },
  { slug: "denizli", label: "Denizli" },
  { slug: "diyarbakir", label: "Diyarbakır" },
  { slug: "duzce", label: "Düzce" },
  { slug: "edirne", label: "Edirne" },
  { slug: "elazig", label: "Elazığ" },
  { slug: "erzincan", label: "Erzincan" },
  { slug: "erzurum", label: "Erzurum" },
  { slug: "eskisehir", label: "Eskişehir" },
  { slug: "gaziantep", label: "Gaziantep" },
  { slug: "giresun", label: "Giresun" },
  { slug: "gumushane", label: "Gümüşhane" },
  { slug: "hakkari", label: "Hakkari" },
  { slug: "hatay", label: "Hatay" },
  { slug: "igdir", label: "Iğdır" },
  { slug: "isparta", label: "Isparta" },
  { slug: "istanbul", label: "İstanbul" },
  { slug: "izmir", label: "İzmir" },
  { slug: "kahramanmaras", label: "Kahramanmaraş" },
  { slug: "karabuk", label: "Karabük" },
  { slug: "karaman", label: "Karaman" },
  { slug: "kars", label: "Kars" },
  { slug: "kastamonu", label: "Kastamonu" },
  { slug: "kayseri", label: "Kayseri" },
  { slug: "kilis", label: "Kilis" },
  { slug: "kirikkale", label: "Kırıkkale" },
  { slug: "kirklareli", label: "Kırklareli" },
  { slug: "kirsehir", label: "Kırşehir" },
  { slug: "kocaeli", label: "Kocaeli" },
  { slug: "konya", label: "Konya" },
  { slug: "kutahya", label: "Kütahya" },
  { slug: "malatya", label: "Malatya" },
  { slug: "manisa", label: "Manisa" },
  { slug: "mardin", label: "Mardin" },
  { slug: "mersin", label: "Mersin" },
  { slug: "mugla", label: "Muğla" },
  { slug: "mus", label: "Muş" },
  { slug: "nevsehir", label: "Nevşehir" },
  { slug: "nigde", label: "Niğde" },
  { slug: "ordu", label: "Ordu" },
  { slug: "osmaniye", label: "Osmaniye" },
  { slug: "rize", label: "Rize" },
  { slug: "sakarya", label: "Sakarya" },
  { slug: "samsun", label: "Samsun" },
  { slug: "sanliurfa", label: "Şanlıurfa" },
  { slug: "siirt", label: "Siirt" },
  { slug: "sinop", label: "Sinop" },
  { slug: "sirnak", label: "Şırnak" },
  { slug: "sivas", label: "Sivas" },
  { slug: "tekirdag", label: "Tekirdağ" },
  { slug: "tokat", label: "Tokat" },
  { slug: "trabzon", label: "Trabzon" },
  { slug: "tunceli", label: "Tunceli" },
  { slug: "usak", label: "Uşak" },
  { slug: "van", label: "Van" },
  { slug: "yalova", label: "Yalova" },
  { slug: "yozgat", label: "Yozgat" },
  { slug: "zonguldak", label: "Zonguldak" }
];

