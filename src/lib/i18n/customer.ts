export type Language = "en" | "mr";

export interface CustomerTranslations {
  menu: string;
  cart: string;
  track: string;
  bill: string;
  service: string;
  searchPlaceholder: string;
  vegOnly: string;
  allDishes: string;
  soldOut: string;
  add: string;
  added: string;
  from: string;
  customizable: string;
  table: string;
  kitchenClosed: string;
  callWaiter: string;
  waiterNotified: string;
  wifi: string;
  wifiCredentials: string;
  yourCart: string;
  cartEmpty: string;
  cartEmptyDesc: string;
  backToMenu: string;
  placeOrder: string;
  proceedToCheckout: string;
  subtotal: string;
  taxGst: string;
  serviceCharge: string;
  grandTotal: string;
  specialInstructions: string;
  notePlaceholder: string;
  item: string;
  items: string;
  activeOrders: string;
  noActiveOrders: string;
  noActiveOrdersDesc: string;
  orderPlaced: string;
  preparing: string;
  ready: string;
  served: string;
  cancelled: string;
  orderNumber: string;
  itemsOrdered: string;
  tableBill: string;
  noBill: string;
  noBillDesc: string;
  requestBill: string;
  billRequested: string;
  paid: string;
  pendingPayment: string;
  serviceMenu: string;
  serviceMenuDesc: string;
  requestWater: string;
  requestCutlery: string;
  cleanTable: string;
  otherRequest: string;
  customNotePlaceholder: string;
  sendRequest: string;
  requestSent: string;
  refresh: string;
  liveStatus: string;
  close: string;
}

export const CUSTOMER_TRANSLATIONS: Record<Language, CustomerTranslations> = {
  en: {
    menu: "Menu",
    cart: "Cart",
    track: "Track",
    bill: "Bill",
    service: "Service",
    searchPlaceholder: "Search dishes, pizza, tikka...",
    vegOnly: "Veg Only",
    allDishes: "All Dishes",
    soldOut: "Sold Out",
    add: "+ Add",
    added: "Added to cart",
    from: "From",
    customizable: "Customizable",
    table: "Table",
    kitchenClosed: "Kitchen Closed",
    callWaiter: "Call Waiter",
    waiterNotified: "Waiter Notified",
    wifi: "Wi-Fi",
    wifiCredentials: "Wi-Fi Details",
    yourCart: "Your Cart",
    cartEmpty: "Your cart is empty",
    cartEmptyDesc: "Browse the menu and add dishes to start your order.",
    backToMenu: "Back to Menu",
    placeOrder: "Place Order",
    proceedToCheckout: "Proceed to Checkout",
    subtotal: "Subtotal",
    taxGst: "Taxes & GST",
    serviceCharge: "Service Charge",
    grandTotal: "Grand Total",
    specialInstructions: "Special Instructions",
    notePlaceholder: "e.g., Less spicy, extra sauce...",
    item: "item",
    items: "items",
    activeOrders: "Live Orders",
    noActiveOrders: "No active orders yet",
    noActiveOrdersDesc: "Add items from the menu and place your order to track its live progress here.",
    orderPlaced: "Order Placed",
    preparing: "Preparing",
    ready: "Ready",
    served: "Served",
    cancelled: "Cancelled",
    orderNumber: "Order",
    itemsOrdered: "Dishes Ordered",
    tableBill: "Table Bill",
    noBill: "No active bill",
    noBillDesc: "Orders placed from your table will automatically show here itemized.",
    requestBill: "Request Bill / Pay",
    billRequested: "Bill requested! Staff has been notified.",
    paid: "Paid",
    pendingPayment: "Payment Due",
    serviceMenu: "Quick Service",
    serviceMenuDesc: "Select an option below to notify your server immediately.",
    requestWater: "Request Water",
    requestCutlery: "Request Cutlery / Napkins",
    cleanTable: "Clean Table",
    otherRequest: "Other Request",
    customNotePlaceholder: "Tell us what you need...",
    sendRequest: "Send Request",
    requestSent: "Request sent to staff!",
    refresh: "Refresh",
    liveStatus: "Live Updates",
    close: "Close",
  },
  mr: {
    menu: "मेनू",
    cart: "कार्ट",
    track: "ट्रॅक",
    bill: "बिल",
    service: "सेवा",
    searchPlaceholder: "पदार्थ, पिझ्झा, टिक्का शोधा...",
    vegOnly: "फक्त शाकाहारी",
    allDishes: "सर्व पदार्थ",
    soldOut: "संपले",
    add: "+ जोडा",
    added: "कार्टमध्ये जोडले",
    from: "किंमत",
    customizable: "पर्याय उपलब्ध",
    table: "टेबल",
    kitchenClosed: "किचन बंद आहे",
    callWaiter: "वेटर बोलवा",
    waiterNotified: "वेटरला कळवले आहे",
    wifi: "वाय-फाय",
    wifiCredentials: "वाय-फाय तपशील",
    yourCart: "तुमची कार्ट",
    cartEmpty: "तुमची कार्ट रिकामी आहे",
    cartEmptyDesc: "मेनूमधून पदार्थ निवडा आणि ऑर्डर सुरू करा.",
    backToMenu: "मेनूकडे परत जा",
    placeOrder: "ऑर्डर द्या",
    proceedToCheckout: "ऑर्डर पूर्ण करा",
    subtotal: "उपएकूण",
    taxGst: "कर आणि जीएसटी",
    serviceCharge: "सेवा शुल्क",
    grandTotal: "एकूण रक्कम",
    specialInstructions: "विशेष सूचना",
    notePlaceholder: "उदा. कमी तिखट, जास्तीचे नॅपकिन्स...",
    item: "पदार्थ",
    items: "पदार्थ",
    activeOrders: "सक्रिय ऑर्डर्स",
    noActiveOrders: "अजून कोणतीही ऑर्डर नाही",
    noActiveOrdersDesc: "मेनूमधून ऑर्डर दिल्यानंतर येथे तिची थेट स्थिती दिसेल.",
    orderPlaced: "ऑर्डर स्वीकारली",
    preparing: "तयार होत आहे",
    ready: "तयार आहे",
    served: "दिली गेली",
    cancelled: "रद्द झाली",
    orderNumber: "ऑर्डर",
    itemsOrdered: "मागवलेले पदार्थ",
    tableBill: "टेबल बिल",
    noBill: "सध्या कोणतेही बिल नाही",
    noBillDesc: "तुमच्या टेबलच्या ऑर्डर्स येथे तपशीलवार दिसतील.",
    requestBill: "बिल मागा / पैसे द्या",
    billRequested: "बिल मागवले आहे! कर्मचारी बिल घेऊन येतील.",
    paid: "भरले",
    pendingPayment: "बाकी रक्कम",
    serviceMenu: "त्वरित सेवा",
    serviceMenuDesc: "त्वरित वेटरला कळवण्यासाठी खालील पर्याय निवडा.",
    requestWater: "पाणी हवे आहे",
    requestCutlery: "चमचे / नॅपकिन्स हवे आहेत",
    cleanTable: "टेबल स्वच्छ करा",
    otherRequest: "इतर विनंती",
    customNotePlaceholder: "तुम्हाला काय हवे आहे ते लिहा...",
    sendRequest: "विनंती पाठवा",
    requestSent: "कर्मचाऱ्यांना विनंती पाठवली आहे!",
    refresh: "रिफ्रेश",
    liveStatus: "थेट अपडेट",
    close: "बंद करा",
  },
};
