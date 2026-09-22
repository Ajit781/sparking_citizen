This is a React Native CLI source bundle, not Expo.

Generate the official iOS native template with:
  npx @react-native-community/cli init SParkingCitizen

Then copy the App.tsx/src/config files from this ZIP into that generated CLI project.
On macOS:
  cd ios
  pod install
  cd ..
  npx react-native run-ios
