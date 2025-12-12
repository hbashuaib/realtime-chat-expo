// app/SignUp.jsx
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  TouchableWithoutFeedback,
  View,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { useState } from "react";

import { router } from "expo-router"; // ✅ Import router

import Input from "../common/Input";
import Button from "../common/Button";
import api from "../core/api";
import utils from "../core/utils";
import useGlobal from "../core/global";

import { theme } from "@/src/core/theme";          // ✅ named import
import { useColorScheme } from "@/hooks/use-color-scheme"; // ✅ hook

function SignUpScreen() {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [password1Error, setPassword1Error] = useState("");
  const [password2Error, setPassword2Error] = useState("");

  const login = useGlobal((state) => state.login);

  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme]; // ✅ resolve light/dark theme

  function onSignUp() {
    const failUsername = !username || username.length < 5;
    if (failUsername) setUsernameError("Username must be >= 5 characters");

    const failFirstName = !firstName;
    if (failFirstName) setFirstNameError("First Name was not provided!");

    const failLastName = !lastName;
    if (failLastName) setLastNameError("Last Name was not provided!");

    const failPassword1 = !password1 || password1.length < 8;
    if (failPassword1) setPassword1Error("Password too short!");

    const failPassword2 = password1 !== password2;
    if (failPassword2) setPassword2Error("Passwords don't match!");

    if (
      failUsername ||
      failFirstName ||
      failLastName ||
      failPassword1 ||
      failPassword2
    ) {
      return;
    }

    console.log("Sending sign-up request...");
    api({
      method: "POST",
      url: "/chat/signup/",
      data: {
        username: username,
        first_name: firstName,
        last_name: lastName,
        password: password1,
      },
    })
      .then((response) => {
        utils.log("Sign Up Success:", response.data);
        const credentials = { username, password: password1 };
        login(credentials, response.data.user, response.data.tokens);

        // ✅ After signup, go straight to tabs
        router.replace("/(tabs)");
      })
      .catch((error) => {
        console.log(
          "Sign Up Full Axios Error:",
          JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        );

        if (error.response) {
          console.log("Sign Up Response Error(Data):", error.response.data);
          console.log("Sign Up Response Error(Status):", error.response.status);
          console.log("Sign Up Response Error(Headers):", error.response.headers);
        } else if (error.request) {
          console.log("Sign Up Request Error:", error.request);
        } else {
          console.log("Sign Up Error:", error.message);
        }
        console.log("Sign Up Axios Config:", error.config);
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
            <Text
              style={{
                textAlign: "center",
                marginBottom: currentTheme.spacing.lg,
                fontSize: 28,
                fontFamily: "MontserratExtraBold",   // ✅ branded font
                color: currentTheme.colors.primary,  // ✅ signature blue

              }}
            >
              Create Account
            </Text>

            <Input
              title="Username:"
              value={username}
              error={usernameError}
              setValue={setUsername}
              setError={setUsernameError}
            />
            <Input
              title="First Name:"
              value={firstName}
              error={firstNameError}
              setValue={setFirstName}
              setError={setFirstNameError}
            />
            <Input
              title="Last Name:"
              value={lastName}
              error={lastNameError}
              setValue={setLastName}
              setError={setLastNameError}
            />
            <Input
              title="Password:"
              value={password1}
              error={password1Error}
              setValue={setPassword1}
              setError={setPassword1Error}
              secureTextEntry={true}
            />
            <Input
              title="Retype Password:"
              value={password2}
              error={password2Error}
              setValue={setPassword2}
              setError={setPassword2Error}
              secureTextEntry={true}
            />

            <Button title="Sign Up" onPress={onSignUp} />

            <Text
              style={{
                textAlign: "center",
                marginTop: currentTheme.spacing.xl,
                color: currentTheme.colors.textSecondary,
              }}
            >
              Already have an account?{" "}
              <Text
                style={{ color: currentTheme.colors.primary }}
                onPress={() => router.back()}
              >
                Sign In
              </Text>
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default SignUpScreen;

