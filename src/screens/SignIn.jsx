// app/SignIn.jsx
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router"; // ✅ Import router

import Button from "../common/Button";
import Input from "../common/Input";
import Title from "../common/Title";
import api from "../core/api";
import useGlobal from "../core/global";
import utils from "../core/utils";

import { useColorScheme } from "@/hooks/use-color-scheme"; // ✅ hook
import { theme } from "@/src/core/theme"; // ✅ named import

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
        router.replace("/(tabs)/Friends");
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
