/*
 *     NOTICE
 *
 *     The Atomrigs Lab mpc software is licensed under a proprietary license or the LGPL v.3.
 *     If you choose to receive it under the LGPL v.3 license, the following applies:
 *     Atomrigs Lab mpc is a Multiparty Computation (MPC)-based cryptographic SW for securing blockchain wallets and applications.
 *
 *     Copyright (C) 2020, Atomrigs Lab Corp.
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Lesser General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import EventEmitter from "events";
import ethUtil from "ethereumjs-util";
import { ethErrors } from "eth-rpc-errors";
import { v4 as uuidv4 } from "uuid";
import AccountUtil from "../../util/account";
// import sigUtil from "eth-sig-util";
const sigUtil = require("eth-sig-util");

const hexRe = /^[0-9A-Fa-f]+$/gu;

export default class PersonalMessageController extends EventEmitter {
  messages;
  mpcService;
  transactionService;
  dekeyStore;
  getMpcJwt;

  constructor({ mpcService, transactionService, dekeyStore, getMpcJwt }) {
    super();
    this.messages = [];
    this.mpcService = mpcService;
    this.transactionService = transactionService;
    this.dekeyStore = dekeyStore;
    this.getMpcJwt = getMpcJwt;
  }

  /**
   * A getter for the number of 'unapproved' PersonalMessages in this.messages
   *
   * @returns {number} The number of 'unapproved' PersonalMessages in this.messages
   *
   */
  get unapprovedPersonalMsgCount() {
    return Object.keys(this.getUnapprovedMsgs()).length;
  }

  /**
   * A getter for the 'unapproved' PersonalMessages in this.messages
   *
   * @returns {Object} An index of PersonalMessage ids to PersonalMessages, for all 'unapproved' PersonalMessages in
   * this.messages
   *
   */
  getUnapprovedMsgs() {
    return this.messages
      .filter((msg) => msg.status === "unapproved")
      .reduce((result, msg) => {
        result[msg.id] = msg;
        return result;
      }, {});
  }

  /**
   * Creates a new PersonalMessage with an 'unapproved' status using the passed msgParams. this.addMsg is called to add
   * the new PersonalMessage to this.messages, and to save the unapproved PersonalMessages from that list to
   * this.memStore.
   *
   * @param {Object} msgParams - The params for the eth_sign call to be made after the message is approved.
   * @param {Object} [req] - The original request object possibly containing the origin
   * @returns {promise} When the message has been signed or rejected
   *
   */
  addUnapprovedMessageAsync(req, res) {
    return new Promise(async (resolve, reject) => {
      const { user } = this.dekeyStore.getState();
      const activeAccount = AccountUtil.getActiveAccount(user.accounts);

      if (req.method === "personal_sign") {
        if (
          req.params[1].toLowerCase() !== activeAccount.ethAddress.toLowerCase()
        ) {
          reject(
            ethErrors.provider.userRejectedRequest(
              "Dekey Message Signature: Address mismatch."
            )
          );
          return;
        }
      } else {
        // eth_sign or klay_sign
        if (
          req.params[0].toLowerCase() !== activeAccount.ethAddress.toLowerCase()
        ) {
          reject(
            ethErrors.provider.userRejectedRequest(
              "Dekey Message Signature: Address mismatch."
            )
          );
          return;
        }
      }

      const msgId = await this.addUnapprovedMessage(req);
      this.once(`${msgId}:finished`, (data) => {
        switch (data.status) {
          case "signed":
            return resolve(data.rawSig);

          case "rejected":
            return reject(
              ethErrors.provider.userRejectedRequest(
                "Dekey Message Signature: User denied message signature."
              )
            );
          default:
            reject(new Error(`Dekey Message Signature: Unknown problem`));
        }
      });
    });
  }

  /**
   * Creates a new PersonalMessage with an 'unapproved' status using the passed msgParams. this.addMsg is called to add
   * the new PersonalMessage to this.messages, and to save the unapproved PersonalMessages from that list to
   * this.memStore.
   *
   * @param {Object} msgParams - The params for the eth_sign call to be made after the message is approved.
   * @param {Object} [req] - The original request object possibly containing the origin
   * @returns {number} The id of the newly created PersonalMessage.
   *
   */
  async addUnapprovedMessage(req) {
    const msgParams = this.getMsgParams(req);
    // add origin from request
    if (req) {
      msgParams.origin = req.domainName;
    }
    msgParams.data = this.normalizeMsgData(msgParams.data);
    // create txData obj with parameters and meta data
    const time = new Date().getTime();
    const msgId = uuidv4();
    const msgData = {
      id: msgId,
      msgParams,
      time,
      status: "unapproved",
      type: req.method,
    };
    await this.addMsg(msgData);

    // this.emit("update");
    // triggerUi(`notification.html?id=${msgId}`);

    this.signPersonalMessage(msgId);
    return msgId;

    // return msgId;
  }

  getMsgParams(req) {
    // const address = await validateAndNormalizeKeyholder(req.params[0], req);
    if (req.method === "personal_sign" || req.method === "klay_sign") {
      const firstParam = req.params[0];
      const secondParam = req.params[1];
      // non-standard "extraParams" to be appended to our "msgParams" obj
      const extraParams = req.params[2] || {};

      // We initially incorrectly ordered these parameters.
      // To gracefully respect users who adopted this API early,
      // we are currently gracefully recovering from the wrong param order
      // when it is clearly identifiable.
      //
      // That means when the first param is definitely an address,
      // and the second param is definitely not, but is hex.
      let address, message;
      if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
        let warning = `The eth_personalSign method requires params ordered `;
        warning += `[message, address]. This was previously handled incorrectly, `;
        warning += `and has been corrected automatically. `;
        warning += `Please switch this param order for smooth behavior in the future.`;
        // res.warning = warning;

        address = firstParam;
        message = secondParam;
      } else {
        message = firstParam;
        address = secondParam;
      }
      return Object.assign({}, extraParams, {
        from: address,
        data: message,
      });
    }
    if (req.method === "eth_sign") {
      const address = req.params[0];
      const message = req.params[1];
      const extraParams = req.params[2] || {};
      return Object.assign({}, extraParams, {
        from: address,
        data: message,
      });
    }
  }

  /**
   * Signifies a user's approval to sign a personal_sign message in queue.
   * Triggers signing, and the callback function from newUnsignedPersonalMessage.
   *
   * @param {Object} msgParams - The params of the message to sign & return to the Dapp.
   * @returns {Promise<Object>} A full state update.
   */
  signPersonalMessage(msgId) {
    // const msgId = msgParams.id;
    const { unapprovedPersonalMsgs } = this.dekeyStore.getState();
    const msgParams = unapprovedPersonalMsgs[msgId];
    if (!msgParams) {
      throw new Error("No msgParams for personal sign");
    }
    // sets the status op the message to 'approved'
    return this.approveMessage(msgParams)
      .then(async (cleanMsgParams) => {
        const { user, accessToken } = this.dekeyStore.getState();
        const activeAccount = AccountUtil.getActiveAccount(user.accounts);

        if (
          cleanMsgParams.msgParams.from.toLowerCase() !==
          activeAccount.ethAddress.toLowerCase()
        ) {
          return;
        }

        const message = cleanMsgParams.msgParams.data;

        let hash = ethUtil.hashPersonalMessage(ethUtil.toBuffer(message));
        hash = ethUtil.bufferToHex(hash);
        const mpcToken = await this.getMpcJwt(accessToken);
        try {
          const { r, s, vsource } = await this.mpcService.sign({
            accountId: activeAccount.id,
            mpcToken,
            txHash: hash,
          });
          const cResult = this.transactionService.concatSig(vsource, r, s);
          const serialized = ethUtil.bufferToHex(cResult);
          return serialized;
        } catch (error) {
          console.error(error);
        }
      })
      .then((rawSig) => {
        // tells the listener that the message has been signed
        // and can be returned to the dapp
        this.setMsgStatusSigned(msgId, rawSig);
        return rawSig;
      })
      .catch((err) => {});
  }

  async personalRecover(req, res) {
    try {
      const message = req.params[0];
      const signature = req.params[1];
      const extraParams = req.params[2] || {};
      const msgParams = Object.assign({}, extraParams, {
        sig: signature,
        data: message,
      });
      const signerAddress = sigUtil.recoverPersonalSignature(msgParams);

      return signerAddress;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Adds a passed PersonalMessage to this.messages, and calls this._saveMsgList() to save the unapproved PersonalMessages from that
   * list to this.memStore.
   *
   * @param {Message} msg - The PersonalMessage to add to this.messages
   *
   */
  async addMsg(msg) {
    this.messages.push(msg);
    await this._saveMsgList();
  }

  /**
   * Returns a specified PersonalMessage.
   *
   * @param {number} msgId - The id of the PersonalMessage to get
   * @returns {PersonalMessage|undefined} The PersonalMessage with the id that matches the passed msgId, or undefined
   * if no PersonalMessage has that id.
   *
   */
  getMsg(msgId) {
    return this.messages.find((msg) => msg.id === msgId);
  }

  async approveMessage(msgParams) {
    try {
      this.setMsgStatusApproved(msgParams.id);
      return this.prepMsgForSigning(msgParams);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sets a PersonalMessage status to 'approved' via a call to this._setMsgStatus.
   *
   * @param {number} msgId - The id of the PersonalMessage to approve.
   *
   */
  setMsgStatusApproved(msgId) {
    this._setMsgStatus(msgId, "approved");
  }

  /**
   * Sets a PersonalMessage status to 'signed' via a call to this._setMsgStatus and updates that PersonalMessage in
   * this.messages by adding the raw signature data of the signature request to the PersonalMessage
   *
   * @param {number} msgId - The id of the PersonalMessage to sign.
   * @param {buffer} rawSig - The raw data of the signature request
   *
   */
  setMsgStatusSigned(msgId, rawSig) {
    const msg = this.getMsg(msgId);
    msg.rawSig = rawSig;
    this._updateMsg(msg);
    this._setMsgStatus(msgId, "signed");
  }

  prepMsgForSigning(msgParams) {
    delete msgParams.id;
    return Promise.resolve(msgParams);
  }

  /**
   * Sets a PersonalMessage status to 'rejected' via a call to this._setMsgStatus.
   *
   * @param {number} msgId - The id of the PersonalMessage to reject.
   *
   */
  rejectMsg(msgId) {
    this._setMsgStatus(msgId, "rejected");
  }

  /**
   * Updates the status of a PersonalMessage in this.messages via a call to this._updateMsg
   *
   * @private
   * @param {number} msgId - The id of the PersonalMessage to update.
   * @param {string} status - The new status of the PersonalMessage.
   * @throws A 'PersonalMessageManager - PersonalMessage not found for id: "${msgId}".' if there is no PersonalMessage
   * in this.messages with an id equal to the passed msgId
   * @fires An event with a name equal to `${msgId}:${status}`. The PersonalMessage is also fired.
   * @fires If status is 'rejected' or 'signed', an event with a name equal to `${msgId}:finished` is fired along
   * with the PersonalMessage
   *
   */
  _setMsgStatus(msgId, status) {
    const msg = this.getMsg(msgId);
    if (!msg) {
      throw new Error(
        `PersonalMessageManager - Message not found for id: "${msgId}".`
      );
    }
    msg.status = status;
    this._updateMsg(msg);
    this.emit(`${msgId}:${status}`, msg);
    if (status === "rejected" || status === "signed") {
      this.emit(`${msgId}:finished`, msg);
    }
  }

  /**
   * Sets a PersonalMessage in this.messages to the passed PersonalMessage if the ids are equal. Then saves the
   * unapprovedPersonalMsgs index to storage via this._saveMsgList
   *
   * @private
   * @param {msg} PersonalMessage - A PersonalMessage that will replace an existing PersonalMessage (with the same
   * id) in this.messages
   *
   */
  async _updateMsg(msg) {
    const index = this.messages.findIndex((message) => message.id === msg.id);
    if (index !== -1) {
      this.messages[index] = msg;
    }
    await this._saveMsgList();
  }

  /**
   * Saves the unapproved PersonalMessages, and their count, to this.memStore
   *
   * @private
   * @fires 'updateBadge'
   *
   */
  async _saveMsgList() {
    const unapprovedPersonalMsgs = this.getUnapprovedMsgs();
    const unapprovedPersonalMsgCount = Object.keys(
      unapprovedPersonalMsgs
    ).length;

    // await localDB.set(UNAPPROVED_PERSONAL_MSGS, unapprovedPersonalMsgs);

    this.dekeyStore.updateStore({
      // [UNAPPROVED_PERSONAL_MSGS]: unapprovedPersonalMsgs,
      unapprovedPersonalMsgs,
    });

    this.emit("updateBadge");
  }

  /**
   * A helper function that converts raw buffer data to a hex, or just returns the data if it is already formatted as a hex.
   *
   * @param {any} data - The buffer data to convert to a hex
   * @returns {string} A hex string conversion of the buffer data
   *
   */
  normalizeMsgData(data) {
    try {
      const stripped = ethUtil.stripHexPrefix(data);
      if (stripped.match(hexRe)) {
        return this._addHexPrefix(stripped);
      }
    } catch (e) {}

    return ethUtil.bufferToHex(Buffer.from(data, "utf8"));
  }

  /**
   * Prefixes a hex string with '0x' or '-0x' and returns it. Idempotent.
   *
   * @param {string} str - The string to prefix.
   * @returns {string} The prefixed string.
   */
  _addHexPrefix = (str) => {
    if (typeof str !== "string" || str.match(/^-?0x/u)) {
      return str;
    }

    if (str.match(/^-?0X/u)) {
      return str.replace("0X", "0x");
    }

    if (str.startsWith("-")) {
      return str.replace("-", "-0x");
    }

    return `0x${str}`;
  };
}

function resemblesAddress(string) {
  // hex prefix 2 + 20 bytes
  return string.length === 2 + 20 * 2;
}
