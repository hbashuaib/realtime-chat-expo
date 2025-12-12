// app/SignIn.jsx
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { useState } from "react";

import { router } from "expo-router"; // ✅ Import router

import Title from "../common/Title";
import Input from "../common/Input";
import Button from "../common/Button";
import api from "../core/api";
import utils from "../core/utils";
import useGlobal from "../core/global";

import { theme } from "@/src/core/theme";          // ✅ named import
import { useColorScheme } from "@/hooks/use-color-scheme"; // ✅ hook

function SignInScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const login = useGlobal((state) => state.login);

  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme]; // ✅ resolve light/dark theme

  function onSignIn() {
    console.log("onSignIn:", username, password);

    const failUsername = !username;
    if (failUsername) {
      setUsernameError("Username not provided!");
    }

    const failPassword = !password;
    if (failPassword) {
      setPasswordError("Password not provided!");
    }

    if (failUsername || failPassword) {
      return;
    }

    console.log("Sending sign-in request...");
    api({
      method: "POST",
      url: "/chat/signin/",
      data: {
        username: username,
        password: password,
      },
    })
      .then((response) => {
        utils.log("Sign In Success:", response.data);
        const credentials = { username, password };
        utils.log("OnSign In Credentials: ", credentials);
        login(credentials, response.data.user, response.data.tokens);

        // ✅ Navigate to tabs
        router.replace("/(tabs)");
      })
      .catch((error) => {
        console.log(
          "Sign In Full Axios Error:",
          JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        );

        if (error.response) {
          console.log("Sign In Response Error(Data):", error.response.data);
          console.log("Sign In Response Error(Status):", error.response.status);
          console.log("Sign In Response Error(Headers):", error.response.headers);
        } else if (error.request) {
          console.log("Sign In Request Error:", error.request);
        } else {
          console.log("Sign In Error:", error.message);
        }
        console.log("Sign In Axios Config:", error.config);
      });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: currentTheme.spacing.lg,
            }}
          >
            <Title 
              text="BashChat"
              color={currentTheme.colors.primary}        // ✅ signature blue
              variant="friends"  
            />

            <Input
              title="Username:"
              value={username}
              error={usernameError}
              setValue={setUsername}
              setError={setUsernameError}
            />
            <Input
              title="Password:"
              value={password}
              error={passwordError}
              setValue={setPassword}
              setError={setPasswordError}
              secureTextEntry={true}
            />

            <Button title="Sign In" onPress={onSignIn} />

            <Text
              style={{
                textAlign: "center",
                marginTop: currentTheme.spacing.xl,
                color: currentTheme.colors.textSecondary,
              }}
            >
              Don't have an account?{" "}
              <Text
                style={{ color: currentTheme.colors.primary }}
                onPress={() => router.push("/SignUp")}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default SignInScreen;
