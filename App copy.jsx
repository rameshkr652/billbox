import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  GoogleSignin,
  GoogleSigninButton,
} from "@react-native-google-signin/google-signin";

const App = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    GoogleSignin.configure({
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      webClientId:
        "384131129772-j9lbdd92ru0l9onceka3bbj2p2vf14nq.apps.googleusercontent.com",
      offlineAccess: true,
    });

    // checkIfUserIsSignedIn();
  }, []); // ✅ Removed `userInfo` dependency to prevent unnecessary calls

  const checkIfUserIsSignedIn = async () => {
    try {
      setAuthLoading(true); // ✅ Set loading before checking
      const user = await GoogleSignin.getCurrentUser();
      if (user) {
        const tokens = await GoogleSignin.getTokens();
        setUserInfo(user.user);
        setAccessToken(tokens.accessToken);
      }
    } catch (error) {
      console.error("Error checking sign-in status:", error);
    } finally {
      setAuthLoading(false); // ✅ Reset loading state
    }
  };

  const signIn = async () => {
    try {
      setAuthLoading(true); // ✅ Prevent multiple sign-in attempts
      await GoogleSignin.hasPlayServices();
      const userInfoResponse = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      setUserInfo(userInfoResponse.user);
      setAccessToken(tokens.accessToken);
      checkIfUserIsSignedIn();
    } catch (error) {
      console.error("Error signing in:", error);
      Alert.alert("Error", "Google sign-in failed.");
    } finally {
      setAuthLoading(false); // ✅ Reset loading state
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      setUserInfo(null);
      setAccessToken(null);
      setEmails([]);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const fetchEmails = async () => {
    if (!accessToken) {
      Alert.alert("Not logged in", "Please sign in first.");
      return;
    }

    try {
      setLoading(true);
      const query = "from:noreply@zomato.com";
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=10`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      if (!data.messages) {
        setEmails([]);
        Alert.alert("No emails found.");
        return;
      }

      const emailDetails = await Promise.all(
        data.messages.map(async (msg) => {
          const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          return await res.json();
        })
      );

      setEmails(
        emailDetails.map((email) => {
          const headers = Object.fromEntries(
            email.payload.headers.map((h) => [h.name.toLowerCase(), h.value])
          );
          return {
            id: email.id,
            subject: headers.subject || "No Subject",
            from: headers.from || "Unknown Sender",
            date: headers.date || "Unknown Date",
            snippet: email.snippet || "No preview available",
          };
        })
      );
    } catch (error) {
      console.error("Error fetching emails:", error);
      Alert.alert("Error", "Failed to fetch emails.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#f9f9f9" }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
        Gmail Inbox
      </Text>

      {authLoading ? ( // ✅ Show loading while checking sign-in status
        <ActivityIndicator size="large" color="#4285F4" />
      ) : !userInfo ? (
        <GoogleSigninButton onPress={signIn} />
      ) : (
        <>
          <Text style={{ marginBottom: 10 }}>Signed in as: {userInfo.email}</Text>
          <TouchableOpacity
            onPress={fetchEmails}
            style={{
              backgroundColor: "#4285F4",
              padding: 10,
              borderRadius: 5,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              Fetch Emails
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signOut}
            style={{
              backgroundColor: "#DB4437",
              padding: 10,
              borderRadius: 5,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Sign Out</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color="#4285F4" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={emails}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  style={{
                    backgroundColor: "white",
                    padding: 15,
                    borderRadius: 5,
                    marginVertical: 5,
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontWeight: "bold" }}>{item.subject}</Text>
                  <Text style={{ color: "#666" }}>{item.from}</Text>
                  <Text numberOfLines={2} style={{ marginTop: 5 }}>
                    {item.snippet}
                  </Text>
                </View>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export default App;
