# ![Express API - Hoot Back-End - Solution](./internal-resources/assets/hero.png)

## About

This repo contains solution code for the [Express API - Hoot Back-End](https://git.generalassemb.ly/modular-curriculum-all-courses/express-api-hoot.git) lecture.

## Getting started

Fork and clone this repository to your local machine.

After moving into the cloned directory, run `npm i` to download the dependencies.

Create a `.env` file in the root of the project:

```bash
touch .env
```

and add your MongoDB URI and a secret JWT string to it. Your MongoDB URI will look something like the first entry, but with your username and password:

```plaintext
MONGODB_URI=mongodb+srv://<username>:<password>@sei.azure.mongodb.net/myApp?retryWrites=true
JWT_SECRET=supersecret
```

Start the app in your terminal with:

``` sh
npm run dev
```

## Internal resources

✏️ [Instructor Guide](./internal-resources/instructor-guide.md)

🏗️ [Release Notes](./internal-resources/release-notes.md)
