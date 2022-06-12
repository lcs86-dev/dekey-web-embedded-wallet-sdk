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

// import * as Worker from './worker.js';
// import Worker from './worker.js';
// eslint-disable-next-line import/no-webpack-loader-syntax
import MpcWorker from "workerize!./mpcWorker.js";

export default class UCWasm {
  worker;
  kgEE;
  sgEE;
  selfSignEE;
  showMnemonicEE;
  recoverEE;
  recoverSIDEE;
  sendCipherEE;
  emRecoverEE;

  constructor(wasmEE) {
    // this.worker = new window.Worker(chrome.runtime.getURL('worker.bundle.js'));
    this.worker = new MpcWorker();

    this.worker.onmessage = (event) => {
      if (event.data.eventType === "wasm:loaded") {
        wasmEE.emit("wasm:loaded", {});
      }
      if (event.data.eventType === "kg" && event.data.done) {
        this.kgEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "sg" && event.data.done) {
        this.sgEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "self-sign" && event.data.done) {
        this.selfSignEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "show-mnemonic" && event.data.done) {
        this.showMnemonicEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "recover" && event.data.done) {
        this.recoverEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "recover-sid" && event.data.done) {
        this.recoverSIDEE.emit("end", event.data.result);
      }
      // if (event.data.eventType === 'send-recovery-email' && event.data.done) {
      //   this.sendRecoveryEmailEE.emit('end', event.data.result);
      // }
      if (event.data.eventType === "send-cipher") {
        this.sendCipherEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "em-recover") {
        this.emRecoverEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "unlock") {
        this.emRecoverEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "addAccount") {
        this.emRecoverEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "changeActiveAccount") {
        this.emRecoverEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "checkPassword") {
        this.emRecoverEE.emit("end", event.data.result);
      }
      if (event.data.eventType === "changePassword") {
        this.emRecoverEE.emit("end", event.data.result);
      }
    };
    this.worker.postMessage({ eventType: "init", data: "go-wasm" });
  }

  terminate() {
    try {
      // console.log('uc-wasm terminate');
      this.worker.terminate();
    } catch (error) {
      // console.error(error);
    }
  }

  generateKeyShare(data, eventEmitter) {
    try {
      this.kgEE = eventEmitter;
      this.worker.postMessage({
        eventType: "kg",
        dto: data,
      });
    } catch (error) {}
  }

  sign(arg, eventEmitter) {
    this.sgEE = eventEmitter;
    this.worker.postMessage({
      eventType: "sg",
      arg,
    });
  }

  selfSign(dto, eventEmitter) {
    this.selfSignEE = eventEmitter;
    const { password, EncPV, hashMessage } = dto;
    this.worker.postMessage({
      eventType: "self-sign",
      arg: dto,
    });
  }

  showMnemonic(dto, eventEmitter) {
    this.showMnemonicEE = eventEmitter;
    this.worker.postMessage({
      eventType: "show-mnemonic",
    });
  }

  recoverShare(dto, eventEmitter) {
    this.recoverEE = eventEmitter;
    this.worker.postMessage({
      eventType: "recover",
      dto,
    });
  }

  recoverSID(dto, eventEmitter) {
    this.recoverSIDEE = eventEmitter;
    this.worker.postMessage({
      eventType: "recover-sid",
      dto,
    });
  }

  sendCipher(dto, eventEmitter) {
    this.sendCipherEE = eventEmitter;
    this.worker.postMessage({
      eventType: "send-cipher",
      dto,
    });
  }

  emRecover(dto, eventEmitter) {
    this.emRecoverEE = eventEmitter;
    this.worker.postMessage({
      eventType: "em-recover",
      dto,
    });
  }

  addAccount(dto, eventEmitter) {
    this.emRecoverEE = eventEmitter;
    this.worker.postMessage({
      eventType: "addAccount",
      dto,
    });
  }

  changeActiveAccount(dto, eventEmitter) {
    this.emRecoverEE = eventEmitter;
    this.worker.postMessage({
      eventType: "changeActiveAccount",
      dto,
    });
  }

  unlock(dto, eventEmitter) {
    this.emRecoverEE = eventEmitter;
    this.worker.postMessage({
      eventType: "unlock",
      dto,
    });
  }

  checkPassword(dto, eventEmitter) {
    this.emRecoverEE = eventEmitter;
    this.worker.postMessage({
      eventType: "checkPassword",
      dto,
    });
  }

  changePassword(dto, eventEmitter) {
    this.emRecoverEE = eventEmitter;
    this.worker.postMessage({
      eventType: "changePassword",
      dto,
    });
  }
}
