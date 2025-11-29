import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SavedPlace = Database["public"]["Tables"]["saved_places"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type WalletTransaction = Database["public"]["Tables"]["wallet_transactions"]["Row"];
type Offer = Database["public"]["Tables"]["offers"]["Row"];
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

// Hook for Saved Places
export function useSavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("saved_places")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.error("Error fetching saved places:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPlace = async (place: Omit<SavedPlace, "id" | "user_id" | "created_at" | "updated_at">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("saved_places")
        .insert({ ...place, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setPlaces([data, ...places]);
      return data;
    } catch (error) {
      console.error("Error adding place:", error);
      throw error;
    }
  };

  const deletePlace = async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_places")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setPlaces(places.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting place:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  return { places, loading, addPlace, deletePlace, refetch: fetchPlaces };
}

// Hook for Bookings
export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const addBooking = async (booking: Omit<Booking, "id" | "user_id" | "created_at" | "updated_at">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...booking, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setBookings([data, ...bookings]);
      return data;
    } catch (error) {
      console.error("Error adding booking:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return { bookings, loading, addBooking, refetch: fetchBookings };
}

// Hook for Wallet
export function useWallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletId, setWalletId] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallet")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (walletError) {
        // Create wallet if it doesn't exist
        const { data: newWallet } = await supabase
          .from("wallet")
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single();

        if (newWallet) {
          setBalance(newWallet.balance);
          setWalletId(newWallet.id);
        }
      } else {
        setBalance(wallet.balance);
        setWalletId(wallet.id);

        // Fetch transactions
        const { data: txns, error: txnError } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!txnError && txns) {
          setTransactions(txns);
        }
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const addMoney = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !walletId) throw new Error("Not authenticated or wallet not found");

      // Update wallet balance
      const newBalance = balance + amount;
      const { error: updateError } = await supabase
        .from("wallet")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", walletId);

      if (updateError) throw updateError;

      // Add transaction
      const { data: txn, error: txnError } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: walletId,
          user_id: user.id,
          type: "credit",
          amount,
          description: "Wallet Recharge",
        })
        .select()
        .single();

      if (txnError) throw txnError;

      setBalance(newBalance);
      setTransactions([txn, ...transactions]);
      return txn;
    } catch (error) {
      console.error("Error adding money:", error);
      throw error;
    }
  };

  const deductMoney = async (amount: number, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !walletId) throw new Error("Not authenticated or wallet not found");

      if (balance < amount) throw new Error("Insufficient balance");

      // Update wallet balance
      const newBalance = balance - amount;
      const { error: updateError } = await supabase
        .from("wallet")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", walletId);

      if (updateError) throw updateError;

      // Add transaction
      const { data: txn, error: txnError } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: walletId,
          user_id: user.id,
          type: "debit",
          amount,
          description,
        })
        .select()
        .single();

      if (txnError) throw txnError;

      setBalance(newBalance);
      setTransactions([txn, ...transactions]);
      return txn;
    } catch (error) {
      console.error("Error deducting money:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return { balance, transactions, loading, addMoney, deductMoney, refetch: fetchWallet };
}

// Hook for Offers
export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .gte("valid_until", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  return { offers, loading, refetch: fetchOffers };
}

// Hook for User Settings
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Create settings if they don't exist
        const { data: newSettings } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (newSettings) setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !settings) throw new Error("Not authenticated or settings not found");

      const { data, error } = await supabase
        .from("user_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
      return data;
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, updateSettings, refetch: fetchSettings };
}

// Hook for data counts
export function useDataCounts() {
  const [counts, setCounts] = useState({
    bookings: 0,
    savedPlaces: 0,
    activeOffers: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [bookingsCount, placesCount, offersCount] = await Promise.all([
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("saved_places")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("offers")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .gte("valid_until", new Date().toISOString().split("T")[0]),
      ]);

      setCounts({
        bookings: bookingsCount.count || 0,
        savedPlaces: placesCount.count || 0,
        activeOffers: offersCount.count || 0,
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return { counts, loading, refetch: fetchCounts };
}
