/**
 * @fileOverview CSPR JS SDK demo: ERC20 - fund users.
 */

import _ from 'lodash';
import { 
    CasperClient,
    CLValueBuilder,
    DeployUtil,
    RuntimeArgs,
} from 'casper-js-sdk';
import * as constants from './utils_constants';
import * as utils from './utils';

// Amount with which to transfer between accounts.
const AMOUNT_TO_TRANSFER = 100000;

/**
 * Demonstration entry point.
 */
 const main = async () => {
    // Step 1: Set casper node client.
    const client = new CasperClient(constants.DEPLOY_NODE_ADDRESS);

    // Step 2: Set contract operator key pair.
    const keyPairOfContract = utils.getKeyPairOfContract(constants.PATH_TO_CONTRACT_KEYS);

    // Step 3: Query node for global state root hash.
    const stateRootHash = await utils.getStateRootHash(client);

    // Step 4: Query node for contract hash.
    const contractHash = await utils.getAccountNamedKeyValue(client, stateRootHash, keyPairOfContract, "ERC20");
    const contractHashAsByteArray = [...Buffer.from(contractHash.slice(5), "hex")];

    // Step 5: Invoke contract transfer_from endpoint.
    const deployHashes = [];
    const userKeyPairSet = utils.getKeyPairOfUserSet(constants.PATH_TO_USERS);
    for (const [userID, userKeyPair] of userKeyPairSet.entries()) {
        // Step 5.1: Set deploy.
        let deploy = DeployUtil.makeDeploy(
            new DeployUtil.DeployParams(
                userKeyPair.publicKey,
                constants.DEPLOY_CHAIN_NAME,
                constants.DEPLOY_GAS_PRICE,
                constants.DEPLOY_TTL_MS
            ),
            DeployUtil.ExecutableDeployItem.newStoredContractByHash(
                contractHashAsByteArray,
                "transfer_from",
                RuntimeArgs.fromMap({
                    amount: CLValueBuilder.u256(AMOUNT_TO_TRANSFER),
                    owner: CLValueBuilder.byteArray(keyPairOfContract.accountHash()),
                    recipient: CLValueBuilder.byteArray(userKeyPair.accountHash())
                })
            ),
            DeployUtil.standardPayment(constants.DEPLOY_GAS_PAYMENT)
        );

        // Step 5.2: Sign deploy.
        deploy = client.signDeploy(deploy, userKeyPair);

        // Step 5.3: Dispatch deploy to node.
        deployHashes.push(await client.putDeploy(deploy));
    }

    // Step 6: Render details.
    for (const [userID, deployHash] of deployHashes.entries()) {
        console.log(`transferring ${AMOUNT_TO_TRANSFER} tokens from user 1 -> user ${userID + 2} :: deploy hash = ${deployHash}`);
    }
};

main();
