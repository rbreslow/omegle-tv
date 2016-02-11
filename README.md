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
```shell
SLACK_TOKEN=<token> SLACK_CHANNEL=<channel> SLACK_ICON=<icon url> npm start
```