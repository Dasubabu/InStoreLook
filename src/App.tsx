import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Screen, AppState, Navigate } from "./types";
import * as Icons from "./components/Icons";
import { useAuth } from "./context/AuthContext";
import SellerLayout from "./components/layout/SellerLayout";
import DashboardScreen from "./components/screens/DashboardScreen";
import InventoryScreen from "./components/screens/InventoryScreen";
import MediaGalleryScreen from "./components/screens/MediaGalleryScreen";
import StoreProfileScreen from "./components/screens/StoreProfileScreen";
import SettingsScreen from "./components/screens/SettingsScreen";
import NotificationsScreen from "./components/screens/NotificationsScreen";
import AddEditProductScreen from "./components/screens/AddEditProductScreen";
import WelcomeScreen from "./components/screens/WelcomeScreen";
import AnalyticsScreen from "./components/screens/AnalyticsScreen";
import RoleSelectScreen from "./components/screens/RoleSelectScreen";
import CustomerLayout from "./components/customer/CustomerLayout";
import CustomerHomeScreen from "./components/customer/CustomerHomeScreen";
import CustomerSearchScreen from "./components/customer/CustomerSearchScreen";
import NearbyStoresScreen from "./components/customer/NearbyStoresScreen";
import CustomerStoreScreen from "./components/customer/CustomerStoreScreen";
import ProductDetailScreen from "./components/customer/ProductDetailScreen";
import SavedScreen from "./components/customer/SavedScreen";
import StyleQuote from "./components/StyleQuote";
import ThemeToggle from "./components/ThemeToggle";
import { initialBrowserRoute, parseLocationRoute, pathForScreen } from "./routing";
import { useTheme } from "./theme";
import { isDemoCatalog } from "./config";
import { AdminScreen, CartScreen, CheckoutScreen, CompareScreen, OrdersScreen } from './commerce/CommerceScreens';

const DEFAULT_APP_STATE: AppState = {
  // A direct visit to / is the shopper home. The intro remains available via
  // the in-app role entry, but it never blocks the primary product flow.
  screen: "customer_home",
  language: "en",
  phoneNumber: "",
};

function createInitialState(): AppState {
  const route = initialBrowserRoute(typeof window === "undefined"
    ? { pathname: "/" }
    : { pathname: window.location.pathname, search: window.location.search, hash: window.location.hash });
  return { ...DEFAULT_APP_STATE, ...route.params, screen: route.screen };
}

function updateBrowserPath(nextPath: string, replace = false) {
  if (typeof window === "undefined") return;

  const nextUrl = nextPath || "/";
  if (replace) {
    window.history.replaceState(null, "", nextUrl);
  } else {
    window.history.pushState(null, "", nextUrl);
  }
}

export default function App() {
  const { login } = useAuth();
  const [state, setState] = useState<AppState>(createInitialState);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isCustomerSurface = state.screen.startsWith("customer_");
  const isPersistentSurface = isCustomerSurface || [
    "seller_home",
    "add_product",
    "inventory",
    "media_gallery",
    "analytics",
    "store_profile",
    "settings",
    "notifications",
  ].includes(state.screen);

  const setPhoneNumber = (phoneNumber: string) =>
    setState((prev) => ({ ...prev, phoneNumber }));

  const navigate: Navigate = (screen, params = {}) => {
    const nextPath = pathForScreen(screen, params);
    if (nextPath) {
      const [pathname, search = ''] = nextPath.split('?');
      const route = parseLocationRoute({ pathname, search });
      setState((prev) => ({ ...prev, ...route.params, screen: route.screen }));
    } else {
      setState((prev) => ({ ...prev, ...params, screen }));
    }

    if (typeof window !== "undefined") {
      if (nextPath && `${window.location.pathname}${window.location.search}` !== nextPath) {
        updateBrowserPath(nextPath);
      } else if (!nextPath && (window.location.pathname !== "/" || window.location.search || window.location.hash)) {
        // Seller/auth state is intentionally not represented in a shareable URL.
        updateBrowserPath("/", true);
      }
    }
  };

  const setScreen = (screen: Screen) => navigate(screen);

  useEffect(() => {
    const syncRoute = () => {
      const route = initialBrowserRoute({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
      setState((prev) => ({ ...prev, ...route.params, screen: route.screen }));
    };

    const syncBrowserRoute = () => {
      const route = initialBrowserRoute({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
      const canonicalPath = pathForScreen(route.screen, route.params);

      // Strip unknown query/hash values on first load or manual edits. This
      // keeps shared URLs deterministic and removes legacy hash fragments.
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (canonicalPath && (currentPath !== canonicalPath || window.location.hash)) {
        updateBrowserPath(canonicalPath, true);
      }
      syncRoute();
    };

    window.addEventListener("popstate", syncBrowserRoute);
    window.addEventListener("hashchange", syncBrowserRoute);
    syncBrowserRoute();

    return () => {
      window.removeEventListener("popstate", syncBrowserRoute);
      window.removeEventListener("hashchange", syncBrowserRoute);
    };
  }, []);

  useEffect(() => {
    if (state.screen === "otp") {
      if (otp.every((digit) => digit !== "")) {
        const verifyAndLogin = async () => {
          setIsSubmitting(true);
          try {
            await login({
              phone: state.phoneNumber, type: "seller"
            });
            setScreen("welcome");
          } catch (err) {
            console.error("Login error:", err);
          } finally {
            setIsSubmitting(false);
          }
        };
        const timer = setTimeout(verifyAndLogin, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [otp, state.screen, login, state.phoneNumber]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="app-shell flex min-h-[100dvh] justify-center overflow-hidden bg-[#f1f2ed] font-sans text-[#151515]">
      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#f7f7f2] shadow-[0_24px_90px_rgba(20,20,20,0.08)]">
        {!isCustomerSurface && (
          <div className={`pointer-events-none absolute z-[80] flex justify-end p-4 sm:p-6 ${isPersistentSurface ? "bottom-16 right-0" : "right-0 top-0"}`}>
            <div className="pointer-events-auto">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {/* FAST, SKIPPABLE ENTRY SPLASH */}
          {state.screen === "splash" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="entry-splash absolute inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-[#1A1A1A] to-[#312E81] p-8 text-white"
              aria-labelledby="splash-title"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="mb-8 z-10"
              >
                <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
                  <Icons.Store size={56} className="text-[#0d7d6f]" />
                </div>
              </motion.div>

              <motion.h1
                id="splash-title"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="z-10 mb-2 text-3xl font-black tracking-tight text-white"
              >
                InStoreLook
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="z-10 text-center text-xs font-bold uppercase tracking-widest text-teal-200"
              >
                Find your next favorite nearby
              </motion.p>

              <StyleQuote className="z-10 mt-8 max-w-xs text-center text-white/80" />

              <div className="z-10 mt-8 flex w-full max-w-xs flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setScreen("role_select")}
                  className="h-12 rounded-full bg-[#d6ff62] px-5 text-xs font-black uppercase tracking-[0.16em] text-[#171717] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] active:scale-[0.98]"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setScreen("customer_home")}
                  className="h-11 rounded-full border border-white/30 bg-white/10 px-5 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] active:scale-[0.98]"
                >
                  Skip intro & browse
                </button>
              </div>

              {isDemoCatalog && (
                <span role="status" className="z-10 mt-5 rounded-full border border-[#d6ff62]/40 bg-[#d6ff62]/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#d6ff62]">
                  Curated demo catalog
                </span>
              )}
            </motion.div>
          )}

          {/* LOGIN SCREEN */}
          {state.screen === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="entry-screen absolute inset-0 flex flex-col justify-center bg-white p-8 text-[#1A1A1A]"
              aria-labelledby="seller-login-title"
            >
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-[#0d7d6f] rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
                  <Icons.Store size={32} className="text-white" />
                </div>
                <h1 id="seller-login-title" className="mb-2 text-2xl font-black text-[#1A1A1A]">Seller Login</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enter your mobile number to continue</p>
              </div>

              <div className="space-y-6">
                <div className="flex h-14 bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-[#0d7d6f] transition-colors">
                  <div className="flex items-center px-4 border-r-2 border-slate-200 bg-slate-100">
                    <span className="text-xs font-black text-[#1A1A1A]">+91</span>
                  </div>
                  <label htmlFor="seller-phone" className="sr-only">Seller mobile number</label>
                  <input
                    id="seller-phone"
                    type="tel"
                    inputMode="numeric"
                    value={state.phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) setPhoneNumber(val);
                    }}
                    placeholder="Enter 10-digit number"
                    autoComplete="tel"
                    className="w-full h-full bg-transparent border-none outline-none px-4 font-black text-[#1A1A1A] placeholder:text-slate-400 placeholder:font-bold text-base"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => state.phoneNumber.length === 10 && setScreen("otp")}
                  disabled={state.phoneNumber.length !== 10}
                  className="w-full h-14 bg-[#1A1A1A] text-white font-black rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  Send OTP
                </button>
              </div>
            </motion.div>
          )}

          {/* OTP SCREEN */}
          {state.screen === "otp" && (
            <motion.div
              key="otp"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="entry-screen absolute inset-0 flex flex-col justify-center bg-white p-8 text-[#1A1A1A]"
              aria-labelledby="seller-otp-title"
            >
              <div className="text-center mb-10">
                <h2 id="seller-otp-title" className="text-2xl font-black text-[#1A1A1A] mb-2">Verify OTP</h2>
                <p className="text-xs font-bold text-slate-500">
                  Code sent to +91 {state.phoneNumber}
                </p>
              </div>
              
              <div className="flex justify-center gap-4 mb-8">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`OTP digit ${index + 1}`}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-14 h-16 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-2xl font-black focus:border-[#0d7d6f] focus:bg-white outline-none transition-colors"
                  />
                ))}
              </div>
              
              <div className="text-center">
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2 text-teal-600 font-bold text-sm">
                    <Icons.Loader2 size={16} className="animate-spin" /> Verifying...
                  </div>
                ) : (
                  <button type="button" className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-[#0d7d6f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7d6f] focus-visible:ring-offset-2">Resend Code</button>
                )}
              </div>
            </motion.div>
          )}

          {state.screen === "role_select" && <RoleSelectScreen setScreen={setScreen} />}

          {/* NEW WELCOME SCREEN */}
          {state.screen === "welcome" && (
            <WelcomeScreen setScreen={setScreen} />
          )}

          {/* SELLER FLOW */}
          {(state.screen === "seller_home" ||
            state.screen === "add_product" ||
            state.screen === "inventory" ||
            state.screen === "media_gallery" ||
            state.screen === "analytics" ||
            state.screen === "store_profile" ||
            state.screen === "settings" ||
            state.screen === "notifications") && (
            <SellerLayout currentScreen={state.screen} setScreen={setScreen}>
              {state.screen === "seller_home" && <DashboardScreen setScreen={setScreen} />}
              {state.screen === "inventory" && <InventoryScreen setScreen={setScreen} />}
              {state.screen === "media_gallery" && <MediaGalleryScreen setScreen={setScreen} />}
              {state.screen === "add_product" && <AddEditProductScreen setScreen={setScreen} />}
              {state.screen === "analytics" && <AnalyticsScreen setScreen={setScreen} />}
              {state.screen === "store_profile" && <StoreProfileScreen setScreen={setScreen} />}
              {state.screen === "settings" && <SettingsScreen setScreen={setScreen} />}
              {state.screen === "notifications" && <NotificationsScreen setScreen={setScreen} />}
            </SellerLayout>
          )}

          {isCustomerSurface && (
             <React.Fragment key={`${state.screen}:${state.selectedProductId || state.selectedStoreId || state.searchCategory || "all"}`}>
              <CustomerLayout
                current={state.screen}
                navigate={navigate}
                themeToggle={<ThemeToggle theme={theme} onToggle={toggleTheme} />}
              >
               {state.screen === "customer_home" && <CustomerHomeScreen navigate={navigate} />}
               {state.screen === "customer_cart" && <CartScreen navigate={navigate} />}
               {state.screen === "customer_checkout" && <CheckoutScreen navigate={navigate} />}
               {state.screen === "customer_orders" && <OrdersScreen navigate={navigate} />}
               {state.screen === "customer_compare" && <CompareScreen navigate={navigate} />}
               {state.screen === "customer_admin" && <AdminScreen navigate={navigate} />}
               {state.screen === "customer_search" && (
                  <React.Fragment key={pathForScreen('customer_search', state)}>
                    <CustomerSearchScreen navigate={navigate} initialCategory={state.searchCategory} initialFilters={state} />
                 </React.Fragment>
               )}
              {state.screen === "customer_stores" && <NearbyStoresScreen navigate={navigate} />}
              {state.screen === "customer_product" && (
                <ProductDetailScreen navigate={navigate} productId={state.selectedProductId} />
              )}
              {state.screen === "customer_store" && (
                <CustomerStoreScreen navigate={navigate} storeId={state.selectedStoreId} />
              )}
              {state.screen === "customer_saved" && <SavedScreen navigate={navigate} />}
             </CustomerLayout>
             </React.Fragment>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
