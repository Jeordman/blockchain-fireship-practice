import * as crypto from "crypto";

class Transaction {
    constructor(
        public amount: number,
        public payer: string, //public key
        public payee: string //public key
    ) {}

    toString() {
        return JSON.stringify(this);
    }
}

// container for multiple transactions (linked to prev)
class Block {
    // random numver
    public nonce = Math.round(Math.random() * 999999999);

    constructor(
        public prevHash: string | null,
        public transaction: Transaction,
        public ts = Date.now()
    ) {}

    // can encript but not decrupt
    get hash() {
        const str = JSON.stringify(this);
        const hash = crypto.createHash("SHA256");
        hash.update(str).end();
        return hash.digest("hex");
    }
}

/** Linked list of blocks */
class Chain {
    // singleton --> only 1 chain
    public static instance = new Chain();

    chain: Block[];

    constructor() {
        //create genesis block -> tranfer 100 to satoshi
        this.chain = [
            new Block(null, new Transaction(100, "genesis", "satoshi")),
        ];
    }

    get lastBlock() {
        return this.chain[this.chain.length - 1];
    }

    mine(nonce: number) {
        let solution = 1;
        console.log("MINING.......");

        while (true) {
            // 158 bits (faster to compute)
            const hash = crypto.createHash("MD5");
            hash.update((nonce + solution).toString()).end();

            const attempt = hash.digest("hex");

            if (attempt.substr(0, 4) === "0000") {
                console.log(`Solved: ${solution}`);
                return solution;
            }

            solution += 1;
        }
    }

    addBlock(
        transaction: Transaction,
        senderPublicKey: string,
        signature: Buffer
    ) {
        // const newBlock = new Block(this.lastBlock.hash, transaction);
        // this.chain.push(newBlock);

        const verifier = crypto.createVerify("SHA256");
        verifier.update(transaction.toString());

        const isValid = verifier.verify(senderPublicKey, signature);

        if (isValid) {
            const newBlock = new Block(this.lastBlock.hash, transaction);
            //proof of work --> prevent double spend -->
            this.mine(newBlock.nonce);
            this.chain.push(newBlock);
        }
    }
}

class Wallet {
    public publicKey: string;
    public privateKey: string;

    constructor() {
        // can encript and decript data (unlike sha)
        const keyPair = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });

        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;
    }

    sendMoney(amount: number, payeePublicKey: string) {
        const transaction = new Transaction(
            amount,
            this.publicKey,
            payeePublicKey
        );

        const sign = crypto.createSign("SHA256");
        sign.update(transaction.toString()).end();

        // validate the signature without exposing priv key
        const signature = sign.sign(this.privateKey);
        Chain.instance.addBlock(transaction, this.publicKey, signature);
    }
}



// ! test----------------------------------------------------------------------
const satoshi = new Wallet();
const jeordin = new Wallet();
const rylie = new Wallet();

satoshi.sendMoney(50, jeordin.publicKey);
jeordin.sendMoney(23, rylie.publicKey);
rylie.sendMoney(5, jeordin.publicKey);

console.log(Chain.instance);
