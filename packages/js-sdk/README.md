# @snowballtools/snowball-sdk

NOTE: This is going through a major refactor and is not ready for use.

## Description

This package enables developers to easily authorize and authenticate users; generate and manage smart wallets (ERC-4337): counterfactual addresss, send, sponsor & bundle user ops; and between chains with ease.

## Features

- [Lit Protocol](https://www.litprotocol.com/) Passkeys
- [Alchemy Light Accounts](https://www.alchemy.com/)
- additional features coming soon

## Installation

### NPM

```zsh
npm install @snowballtools/snowball-sdk
```

### Yarn

```zsh
yarn add @snowballtools/snowball-sdk
```

## Usage

```typescript
import { SnowballSDK } from '@snowballtools/snowball-sdk';

import {
  Snowball,
  CHAINS,
  SmartWalletProvider,
  AlchemySmartWalletProviderKey,
} from "@snowballtools/snowball-ts-sdk";

export const snowball = new Snowball(
  "snowball-api-key",
  CHAINS.goerli, // chain
  {
    name: 'lit',
    apiKeys: {
      ["relayKey": "LIT_RELAY_KEY"],
    },
    // optional
    config: {
      ["network"]: "cayenne", // default is cayenne (testnet). lit networks list: [testnet](https://developer.litprotocol.com/v3/network/networks/testnet) ex. serrano, cayenne, manzano; [mainnet](https://developer.litprotocol.com/v3/network/networks/mainnet). ex: jalapeno, habanero
    },
  },
  {
    name: SmartWalletProvider.alchemy,
    apiKeys: {
      [AlchemySmartWalletProviderKey.ethereumGoerli]: "ALCHEMY_GOERLI_API_KEY",
      [AlchemySmartWalletProviderKey.ethereumGoerli_gasPolicyId]:
        "ALCHEMY_GOERLI_GAS_POLICY_ID",
      [AlchemySmartWalletProviderKey.ethereumSepolia]: "ALCHEMY_SEPOLIA_API_KEY",
      [AlchemySmartWalletProviderKey.ethereumSepolia_gasPolicyId]:
        "ALCHEMY_SEPOLIA_GAS_POLICY_ID",
    },
  }
);
```

## Documentation

- [TS SDK](https://sdk.snowballtools.xyz)
