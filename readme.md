# Preparation

Create database
You can create from mongo shell with this command

```bash
use healtbeats
```

Login to mailtrap.io using username and password to see a verify code
email		: faisol@kilkproductions.com
password	: bigsecret

## Run Project

Install dependency
```bash
npm install
```

Create user
```bash
http://localhost:3000/craate-user or http://127.0.0.1:3000/create-user
```
This command create one user
username : faisol
password : 123456

Lets try
```bash
http://localhost:3000 or http://127.0.0.1:3000
```

Feature you can try
- Login with wrong username
- Login with correct username and wrong password
- Login with correct username and correct password
- Verify with wrong code
- You can try wrong code and not waiting for 10 second
- You can try wrong code for 3 attempts
- Try with correct code
- Try with correct code but expired on 2 minutes after generate

If your account is locked you can delete all user with this command
```bash
http://localhost:3000/delete-all-user or http://127.0.0.1:3000/delete-all-user
```

Or activated all user
```bash
http://localhost:3000/activated-all-user or http://127.0.0.1:3000/activated-all-user
```

If you choose delete all user you can create default user again with this command
```bash
http://localhost:3000/craate-user or http://127.0.0.1:3000/create-user
```
This command create one user
username : faisol
password : 123456