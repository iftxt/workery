# Workery
A generic JavaScript worker as AMQP consumer.

# Prerequisites
- node v8.x.x - `sudo n latest` or `nvm install 8.1.0`
- yarn - `sudo npm i -g yarn`

# Installation
```bash
yarn
```

# Run
```bash
ts-node --fast index.ts
```

# Usage
Set a `.dotenv` configuration file in the root with these definitions:
- AMQP_ENDPOINT
- AMQP_QUEUE

Please note that this project is released with a [Contributor Code of Conduct](code-of-conduct.md). By participating in this project you agree to abide by its terms.
