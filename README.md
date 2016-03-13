# omegle-tv

Man in the middle attack for [Omegle](https://omegle.com/) that shows user conversations in [Slack](https://slack.com). A remote integration token from Slack is required for functionality.

Installation
---
Clone the repository:
```shell
$ git clone git@github.com:rbreslow/omegle-tv.git
```
Install the required dependencies:
```shell
$ npm install
```

Usage
---
To start the bot:
```shell
$ SLACK_TOKEN=<token> SLACK_CHANNEL=<channel> SLACK_ICON=<icon url for bot> SLACK_ICON_A=<person a icon url> SLACK_ICON_B=<person b icon url> npm start
```

Commands
---
`!retry` searches for a new chat session.

`!topic <topics>` sets the topics. ex: `!topic roleplay tumblr`.

`!saya <message>` says something as Person A to Person B. ex: `!saya yo yo yo sup`.

`!sayb <message>` says something as Person B to Person A.