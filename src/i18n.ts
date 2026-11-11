export type Language = 'en' | 'te' | 'hi';

export interface Translation {
  welcome: string;
  tagline: string;
  findProducts: string;
  mobileNumber: string;
  enterNumber: string;
  continue: string;
  continueAsCustomer: string;
  continueAsSeller: string;
  or: string;
  continueWithGoogle: string;
  termsAndPrivacy: string;
  termsOfService: string;
  privacyPolicy: string;
  verifyNumber: string;
  enterOtp: string;
  changeNumber: string;
  resendCode: string;
  verifyAndContinue: string;
  secureVerification: string;
  allRightsReserved: string;
  customer: string;
  seller: string;
  customerDesc: string;
  sellerDesc: string;
  howToUse: string;
  initializingDiscovery: string;
  findItNearby: string;
  knowBeforeYouGo: string;
  onboardingDesc: string;
  getStarted: string;
  registerStore: string;
  step: string;
  basicInfo: string;
  basicInfoDesc: string;
  storeName: string;
  storeCategory: string;
  selectCategory: string;
  storeAddress: string;
  setPin: string;
  shopNumber: string;
  storePhotos: string;
  next: string;
  sellerTerms: string;
  storeStatus: string;
  open: string;
  closed: string;
  storeSummary: string;
  products: string;
  inStock: string;
  out: string;
  performance: string;
  directionRequests: string;
  views: string;
  conversion: string;
  quickActions: string;
  addProduct: string;
  updateStock: string;
  manageStore: string;
  inventoryPreview: string;
  viewAll: string;
  currentLocation: string;
  searchPlaceholder: string;
  voiceSearch: string;
  visualSearch: string;
  availableNearby: string;
  nearbyStores: string;
  suggestedStores: string;
  home: string;
  search: string;
  saved: string;
  profile: string;
  findProductsAroundYou: string;
  locationPermissionDesc: string;
  useCurrentLocation: string;
  enterLocationManually: string;
  privacyNotice: string;
  letsGetToKnowYou: string;
  profileSetupDesc: string;
  fullName: string;
  addPhoto: string;
  scan: string;
  details: string;
  price: string;
  publish: string;
  editPhoto: string;
  aiSuggestions: string;
  tellUsAboutProduct: string;
  productName: string;
  category: string;
  subcategory: string;
  brandDetails: string;
  localBrand: string;
  description: string;
  color: string;
  pattern: string;
  saveDraft: string;
  continueToPrice: string;
  sellingPrice: string;
  mrp: string;
  discountOffered: string;
  availability: string;
  lowStock: string;
  outOfStock: string;
  quantityInHand: string;
  availableSizes: string;
  previewListing: string;
  productClear: string;
  pinchToZoom: string;
  retake: string;
  callStore: string;
  saveProduct: string;
  getDirections: string;
  nearest: string;
  priceLow: string;
  inStockFilter: string;
  brandFilter: string;
  resultsNearby: string;
  updatedJustNow: string;
}

export const translations: Record<Language, Translation> = {
  en: {
    welcome: "Welcome to InStoreLook",
    tagline: "Find products available in stores near you.",
    findProducts: "Find products available in stores near you.",
    mobileNumber: "Mobile Number",
    enterNumber: "Enter your number",
    continue: "Continue",
    continueAsCustomer: "Continue as Customer",
    continueAsSeller: "Continue as Seller",
    or: "OR",
    continueWithGoogle: "Continue with Google",
    termsAndPrivacy: "By continuing, you agree to InStoreLook's Terms of Service and Privacy Policy.",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    verifyNumber: "Verify your number",
    enterOtp: "Enter the 6-digit code sent to",
    changeNumber: "Change phone number",
    resendCode: "Resend code in",
    verifyAndContinue: "Verify & Continue",
    secureVerification: "Secure 256-bit SSL encrypted verification",
    allRightsReserved: "© 2024 InStoreLook discovery platform. All rights reserved.",
    customer: "Customer",
    seller: "Seller",
    customerDesc: "Find products available in nearby stores",
    sellerDesc: "Manage your store and products",
    howToUse: "How would you like to use InStoreLook?",
    initializingDiscovery: "Initializing Discovery",
    findItNearby: "Find it nearby.",
    knowBeforeYouGo: "Know before you go.",
    onboardingDesc: "Check product availability, compare nearby stores, and get directions before leaving home.",
    getStarted: "Get Started",
    registerStore: "Register Your Store",
    step: "Step",
    basicInfo: "Basic Information",
    basicInfoDesc: "Tell us the core details of your business to help local customers find you in the marketplace.",
    storeName: "Store Name",
    storeCategory: "Store Category",
    selectCategory: "Select a category",
    storeAddress: "Store Address",
    setPin: "Set Pin on Map",
    shopNumber: "Shop Number",
    storePhotos: "Store Photos",
    next: "Next",
    sellerTerms: "Seller Terms",
    storeStatus: "Store Status",
    open: "Open",
    closed: "Closed",
    storeSummary: "Store Summary",
    products: "Products",
    inStock: "In-Stock",
    out: "Out",
    performance: "Performance",
    directionRequests: "Direction Requests",
    views: "Views",
    conversion: "Conversion",
    quickActions: "Quick Actions",
    addProduct: "Add Product",
    updateStock: "Update Stock",
    manageStore: "Manage Store",
    inventoryPreview: "Inventory Preview",
    viewAll: "View All",
    currentLocation: "Current Location",
    searchPlaceholder: "Search products near you...",
    voiceSearch: "Voice Search",
    visualSearch: "Visual Search",
    availableNearby: "Available Nearby",
    nearbyStores: "Nearby Stores",
    suggestedStores: "Suggested Stores",
    home: "Home",
    search: "Search",
    saved: "Saved",
    profile: "Profile",
    findProductsAroundYou: "Find products around you",
    locationPermissionDesc: "InStoreLook uses your location to show products and stores available near you.",
    useCurrentLocation: "Use My Current Location",
    enterLocationManually: "Enter Location Manually",
    privacyNotice: "We value your privacy. Your location is never shared with third parties without your consent.",
    letsGetToKnowYou: "Let's get to know you",
    profileSetupDesc: "Complete your profile to start discovering local products near you.",
    fullName: "Full Name",
    addPhoto: "Add Photo",
    scan: "Scan",
    details: "Details",
    price: "Price",
    publish: "Publish",
    editPhoto: "Edit Photo",
    aiSuggestions: "AI suggestions added — please review",
    tellUsAboutProduct: "Tell us about this product",
    productName: "Product Name",
    category: "Category",
    subcategory: "Subcategory",
    brandDetails: "Brand Details",
    localBrand: "Local Brand",
    description: "Description",
    color: "Color",
    pattern: "Pattern",
    saveDraft: "Save Draft",
    continueToPrice: "Continue to Price",
    sellingPrice: "Selling Price",
    mrp: "MRP",
    discountOffered: "discount offered to customers.",
    availability: "Availability",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    quantityInHand: "Quantity in Hand",
    availableSizes: "Available Sizes",
    previewListing: "Preview Listing",
    productClear: "Does your product look clear?",
    pinchToZoom: "Pinch to zoom",
    retake: "Retake",
    callStore: "Call Store",
    saveProduct: "Save Product",
    getDirections: "Get Directions",
    nearest: "Nearest",
    priceLow: "Price",
    inStockFilter: "In Stock",
    brandFilter: "Brand",
    resultsNearby: "Results Nearby",
    updatedJustNow: "Updated Just Now"
  },
  te: {
    welcome: "InStoreLook కి స్వాగతం",
    tagline: "మీ చుట్టుపక్కల దుకాణాల్లో అందుబాటులో ఉన్న ఉత్పత్తులను కనుగొనండి.",
    findProducts: "మీ చుట్టుపక్కల దుకాణాల్లో అందుబాటులో ఉన్న ఉత్పత్తులను కనుగొనండి.",
    mobileNumber: "మొబైల్ సంఖ్య",
    enterNumber: "మీ సంఖ్యను నమోదు చేయండి",
    continue: "కొనసాగించండి",
    continueAsCustomer: "కస్టమర్‌గా కొనసాగండి",
    continueAsSeller: "విక్రేతగా కొనసాగండి",
    or: "లేదా",
    continueWithGoogle: "గూగుల్‌తో కొనసాగండి",
    termsAndPrivacy: "కొనసాగించడం ద్వారా, మీరు InStoreLook యొక్క సేవా నిబంధనలు మరియు గోప్యతా విధానాన్ని అంగీకరిస్తున్నారు.",
    termsOfService: "సేవా నిబంధనలు",
    privacyPolicy: "గోప్యతా విధానం",
    verifyNumber: "మీ సంఖ్యను ధృవీకరించండి",
    enterOtp: "పంపిన 6-అంకెల కోడ్‌ను నమోదు చేయండి",
    changeNumber: "ఫోన్ నంబర్ మార్చండి",
    resendCode: "కోడ్ మళ్లీ పంపడానికి సమయం",
    verifyAndContinue: "ధృవీకరించండి & కొనసాగించండి",
    secureVerification: "సురక్షితమైన 256-బిట్ SSL ఎన్‌క్రిప్టెడ్ వెరిఫికేషన్",
    allRightsReserved: "© 2024 InStoreLook. అన్ని హక్కులు ప్రత్యేకించబడినవి.",
    customer: "కస్టమర్",
    seller: "విక్రేత",
    customerDesc: "దగ్గర్లోని దుకాణాల్లో ఉత్పత్తులను కనుగొనండి",
    sellerDesc: "మీ దుకాణం మరియు ఉత్పత్తులను నిర్వహించండి",
    howToUse: "మీరు InStoreLook ని ఎలా ఉపయోగించాలనుకుంటున్నారు?",
    initializingDiscovery: "ప్రారంభిస్తోంది",
    findItNearby: "దగ్గర్లోనే కనుగొనండి.",
    knowBeforeYouGo: "వెళ్లేముందే తెలుసుకోండి.",
    onboardingDesc: "ఇంటి నుండి బయలుదేరే ముందే ఉత్పత్తి లభ్యతను తనిఖీ చేయండి, దుకాణాలను పోల్చండి మరియు దిశలను పొందండి.",
    getStarted: "ప్రారంభించండి",
    registerStore: "మీ దుకాణాన్ని నమోదు చేయండి",
    step: "దశ",
    basicInfo: "ప్రాథమిక సమాచారం",
    basicInfoDesc: "స్థానిక కస్టమర్‌లు మిమ్మల్ని కనుగొనడంలో సహాయపడటానికి మీ వ్యాపార వివరాలను తెలియజేయండి.",
    storeName: "దుకాణం పేరు",
    storeCategory: "దుకాణం వర్గం",
    selectCategory: "ఒక వర్గాన్ని ఎంచుకోండి",
    storeAddress: "దుకాణం చిరునామా",
    setPin: "మ్యాప్‌లో పిన్ సెట్ చేయండి",
    shopNumber: "షాప్ నంబర్",
    storePhotos: "దుకాణం ఫోటోలు",
    next: "తరువాత",
    sellerTerms: "విక్రేత నిబంధనలు",
    storeStatus: "దుకాణం స్థితి",
    open: "తెరిచి ఉంది",
    closed: "మూసివేసి ఉంది",
    storeSummary: "దుకాణ సారాంశం",
    products: "ఉత్పత్తులు",
    inStock: "స్టాక్ ఉంది",
    out: "లేదు",
    performance: "పనితీరు",
    directionRequests: "దిశల అభ్యర్థనలు",
    views: "వీక్షణలు",
    conversion: "కన్వర్షన్",
    quickActions: "త్వరిత చర్యలు",
    addProduct: "ఉత్పత్తిని జోడించండి",
    updateStock: "స్టాక్ అప్‌డేట్",
    manageStore: "దుకాణ నిర్వహణ",
    inventoryPreview: "ఇన్వెంటరీ ప్రివ్యూ",
    viewAll: "అన్నీ చూడండి",
    currentLocation: "ప్రస్తుత ప్రాంతం",
    searchPlaceholder: "మీకు దగ్గర్లో వెతకండి...",
    voiceSearch: "వాయిస్ సెర్చ్",
    visualSearch: "విజువల్ సెర్చ్",
    availableNearby: "దగ్గర్లో అందుబాటులో ఉన్నాయి",
    nearbyStores: "దగ్గర్లోని దుకాణాలు",
    suggestedStores: "సూచించబడిన దుకాణాలు",
    home: "హోమ్",
    search: "వెతకండి",
    saved: "సేవ్ చేసినవి",
    profile: "ప్రొఫైల్",
    findProductsAroundYou: "మీ చుట్టూ ఉన్న ఉత్పత్తులను కనుగొనండి",
    locationPermissionDesc: "InStoreLook మీ చుట్టుపక్కల ఉత్పత్తులు మరియు దుకాణాలను చూపించడానికి మీ ప్రాంతాన్ని ఉపయోగిస్తుంది.",
    useCurrentLocation: "నా ప్రస్తుత ప్రాంతాన్ని ఉపయోగించండి",
    enterLocationManually: "ప్రాంతాన్ని మాన్యువల్‌గా నమోదు చేయండి",
    privacyNotice: "మేము మీ గోప్యతను గౌరవిస్తాము. మీ అనుమతి లేకుండా మీ ప్రాంతం ఇతరులతో పంచుకోబడదు.",
    letsGetToKnowYou: "మీ గురించి మాకు తెలియజేయండి",
    profileSetupDesc: "ఉత్పత్తులను కనుగొనడం ప్రారంభించడానికి మీ ప్రొఫైల్‌ను పూర్తి చేయండి.",
    fullName: "పూర్తి పేరు",
    addPhoto: "ఫోటో జోడించండి",
    scan: "స్కాన్",
    details: "వివరాలు",
    price: "ధర",
    publish: "ప్రచురించు",
    editPhoto: "ఫోటో సవరించు",
    aiSuggestions: "AI సూచనలు జోడించబడ్డాయి — దయచేసి సమీక్షించండి",
    tellUsAboutProduct: "ఈ ఉత్పత్తి గురించి మాకు చెప్పండి",
    productName: "ఉత్పత్తి పేరు",
    category: "వర్గం",
    subcategory: "ఉపవర్గం",
    brandDetails: "బ్రాండ్ వివరాలు",
    localBrand: "స్థానిక బ్రాండ్",
    description: "వివరణ",
    color: "రంగు",
    pattern: "నమూనా",
    saveDraft: "డ్రాఫ్ట్ సేవ్ చేయండి",
    continueToPrice: "ధరకు కొనసాగండి",
    sellingPrice: "అమ్మకపు ధర",
    mrp: "MRP",
    discountOffered: "కస్టమర్లకు అందించే తగ్గింపు.",
    availability: "లభ్యత",
    lowStock: "తక్కువ స్టాక్",
    outOfStock: "స్టాక్ లేదు",
    quantityInHand: "అందుబాటులో ఉన్న పరిమాణం",
    availableSizes: "అందుబాటులో ఉన్న పరిమాణాలు",
    previewListing: "లిస్టింగ్ ప్రివ్యూ",
    productClear: "మీ ఉత్పత్తి స్పష్టంగా ఉందా?",
    pinchToZoom: "జూమ్ చేయడానికి పించ్ చేయండి",
    retake: "మళ్లీ తీసుకోండి",
    callStore: "దుకాణానికి కాల్ చేయండి",
    saveProduct: "ఉత్పత్తిని సేవ్ చేయండి",
    getDirections: "దిశలను పొందండి",
    nearest: "దగ్గరలో",
    priceLow: "ధర",
    inStockFilter: "స్టాక్ ఉంది",
    brandFilter: "బ్రాండ్",
    resultsNearby: "దగ్గరలో ఫలితాలు",
    updatedJustNow: "ఇప్పుడే అప్‌డేట్ చేయబడింది"
  },
  hi: {
    welcome: "InStoreLook में आपका स्वागत है",
    tagline: "अपने आस-पास की दुकानों में उपलब्ध उत्पाद खोजें।",
    findProducts: "अपने आस-पास की दुकानों में उपलब्ध उत्पाद खोजें।",
    mobileNumber: "मोबाइल नंबर",
    enterNumber: "अपना नंबर दर्ज करें",
    continue: "जारी रखें",
    continueAsCustomer: "ग्राहक के रूप में जारी रखें",
    continueAsSeller: "विक्रेता के रूप में जारी रखें",
    or: "या",
    continueWithGoogle: "गूगल के साथ जारी रखें",
    termsAndPrivacy: "जारी रखकर, आप InStoreLook की सेवा की शर्तों और गोपनीयता नीति से सहमत होते हैं।",
    termsOfService: "सेवा की शर्तें",
    privacyPolicy: "गोपनीयता नीति",
    verifyNumber: "अपना नंबर सत्यापित करें",
    enterOtp: "भेजे गए 6-अंकीय कोड को दर्ज करें",
    changeNumber: "फ़ोन नंबर बदलें",
    resendCode: "कोड पुन: भेजने में समय",
    verifyAndContinue: "सत्यापित करें और जारी रखें",
    secureVerification: "सुरक्षित 256-बिट SSL एन्क्रिप्टेड सत्यापन",
    allRightsReserved: "© 2024 InStoreLook. सर्वाधिकार सुरक्षित।",
    customer: "ग्राहक",
    seller: "विक्रेता",
    customerDesc: "आस-पास की दुकानों में उत्पाद खोजें",
    sellerDesc: "अपनी दुकान और उत्पादों का प्रबंधन करें",
    howToUse: "आप InStoreLook का उपयोग कैसे करना चाहेंगे?",
    initializingDiscovery: "प्रारंभ हो रहा है",
    findItNearby: "आस-पास ही खोजें।",
    knowBeforeYouGo: "जाने से पहले जान लें।",
    onboardingDesc: "घर से निकलने से पहले उत्पाद की उपलब्धता जांचें, दुकानों की तुलना करें और दिशा-निर्देश प्राप्त करें।",
    getStarted: "शुरू करें",
    registerStore: "अपनी दुकान पंजीकृत करें",
    step: "चरण",
    basicInfo: "बुनियादी जानकारी",
    basicInfoDesc: "स्थानीय ग्राहकों को आपको खोजने में मदद करने के लिए अपने व्यवसाय के विवरण बताएं।",
    storeName: "दुकान का नाम",
    storeCategory: "दुकान की श्रेणी",
    selectCategory: "श्रेणी चुनें",
    storeAddress: "दुकान का पता",
    setPin: "मैप पर पिन सेट करें",
    shopNumber: "शॉप नंबर",
    storePhotos: "दुकान की तस्वीरें",
    next: "अगला",
    sellerTerms: "विक्रेता शर्तें",
    storeStatus: "दुकान की स्थिति",
    open: "खुला है",
    closed: "बंद है",
    storeSummary: "दुकान का सारांश",
    products: "उत्पाद",
    inStock: "स्टॉक में",
    out: "नहीं",
    performance: "प्रदर्शन",
    directionRequests: "दिशा-निर्देश अनुरोध",
    views: "दृश्य",
    conversion: "रूपांतरण",
    quickActions: "त्वरित कार्रवाई",
    addProduct: "उत्पाद जोड़ें",
    updateStock: "स्टॉक अपडेट",
    manageStore: "दुकान का प्रबंधन",
    inventoryPreview: "इन्वेंटरी पूर्वावलोकन",
    viewAll: "सभी देखें",
    currentLocation: "वर्तमान स्थान",
    searchPlaceholder: "आस-पास उत्पाद खोजें...",
    voiceSearch: "वॉयस सर्च",
    visualSearch: "विजुअल सर्च",
    availableNearby: "आस-पास उपलब्ध",
    nearbyStores: "आस-पास की दुकानें",
    suggestedStores: "सुझाए गए स्टोर",
    home: "होम",
    search: "खोजें",
    saved: "सेव किए गए",
    profile: "प्रोफ़ाइल",
    findProductsAroundYou: "अपने आस-पास के उत्पाद खोजें",
    locationPermissionDesc: "InStoreLook आपके आस-पास के उत्पादों और दुकानों को दिखाने के लिए आपके स्थान का उपयोग करता है।",
    useCurrentLocation: "मेरे वर्तमान स्थान का उपयोग करें",
    enterLocationManually: "स्थान मैन्युअल रूप से दर्ज करें",
    privacyNotice: "हम आपकी गोपनीयता का सम्मान करते हैं। आपकी अनुमति के बिना आपका स्थान साझा नहीं किया जाएगा।",
    letsGetToKnowYou: "आइए आपको जानते हैं",
    profileSetupDesc: "उत्पादों की खोज शुरू करने के लिए अपनी प्रोफ़ाइल पूरी करें।",
    fullName: "पूरा नाम",
    addPhoto: "तस्वीर जोड़ें",
    scan: "स्कैन",
    details: "विवरण",
    price: "कीमत",
    publish: "प्रकाशित करें",
    editPhoto: "तस्वीर बदलें",
    aiSuggestions: "AI सुझाव जोड़े गए — कृपया समीक्षा करें",
    tellUsAboutProduct: "हमें इस उत्पाद के बारे में बताएं",
    productName: "उत्पाद का नाम",
    category: "श्रेणी",
    subcategory: "उपश्रेणी",
    brandDetails: "ब्रांड विवरण",
    localBrand: "स्थानीय ब्रांड",
    description: "विवरण",
    color: "रंग",
    pattern: "पैटर्न",
    saveDraft: "ड्राफ्ट सेव करें",
    continueToPrice: "कीमत पर जारी रखें",
    sellingPrice: "विक्रय मूल्य",
    mrp: "MRP",
    discountOffered: "ग्राहकों को दी जाने वाली छूट।",
    availability: "उपलब्धता",
    lowStock: "कम स्टॉक",
    outOfStock: "स्टॉक में नहीं",
    quantityInHand: "उपलब्ध मात्रा",
    availableSizes: "उपलब्ध आकार",
    previewListing: "लिस्टिंग पूर्वावलोकन",
    productClear: "क्या आपका उत्पाद स्पष्ट दिख रहा है?",
    pinchToZoom: "ज़ूम करने के लिए पिंच करें",
    retake: "फिर से लें",
    callStore: "स्टोर को कॉल करें",
    saveProduct: "उत्पाद सेव करें",
    getDirections: "दिशा-निर्देश प्राप्त करें",
    nearest: "निकटतम",
    priceLow: "कीमत",
    inStockFilter: "स्टॉक में",
    brandFilter: "ब्रांड",
    resultsNearby: "आस-पास के परिणाम",
    updatedJustNow: "अभी अपडेट किया गया"
  }
};
