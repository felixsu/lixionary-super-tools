# Lixionary Super Tools

A web app that serve multiple simple tools to help calculation, debugging, and generation. The web app is paired with a simple backend. Web app shows home screen of multiple tools, grouped into categories. The home page is accessible without required user to log in. Sign in is optional, and it is using google SSO only. If user signed in, store user data into the backend system, and save some configuration so user can maintain their state in the future. 

## Features

1. Search
- Let user use CMD+K or CTRL+K (windows) to search tools in the web app
- When user trigger search, show a dialog for the user to type their keyword, and find the closest tools match to user's input. Use offline fuzzy search and other approximation algorithm to help the user find the tools

2. Page layout
- On home page, there's header bar, tab bar, and main screen. 
- Header bar consist of web app title and sign in button (or user profile if user is signed in)
- Tab bar is used for the user to navigate around the tools. 

3. Main Page section
- In the Main page, when user is at "Home", shows "Favourite" and the tools avaialble grouped by its category
- Initial groups: Favourite, Encoding/Decoding, Cryptography, Random

### Encoding/Decoding

1. Base64: decode base64 string back to string and encode string to base64 in string, user can select the encodings.
2. URL: decode URL encoded string back to normal string and encode string to URL encoded

### Cryptography

1. HMAC: user add secret and the string content, generate the base64 HMAC string. Allow user to choose the Hash algorithm
2. JWT: user can generate and decode JWT and validate it.
3. RSA key generator: user can generate public and private key and try to encrypt some string. Print the base64 of encrypted file. Add decrypt function as well

### Random

1. Coin toss, simulate coint toss simulation, show histogram of the result. Store in the browser local storage
2. Dice roll, simulate dice roll simulation, show histogram of the result to verify the random distribution

## Save state

1. Backend only save the user and the favourite tools id
2. user's opened tab and the value is stored in the browser's local storage. 
