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
import UCWasm from "../../wasm/uc-wasm";

export class MpcService extends EventEmitter {
  constructor() {
    super();
    this.wasmEE = new EventEmitter();
    this.uCWasm = new UCWasm(this.wasmEE);

    this.wasmEE.on("wasm:loaded", (e) => {
      this.emit("wasm:loaded");
    });
  }

  generateKeyShare(data) {
    return new Promise((resolve, reject) => {
      const eventObj = new EventEmitter();

      eventObj.once("end", (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(result.message);
        }
        // event.source.postMessage(
        //   {
        //     result: result,
        //     command,
        //   },
        //   event.origin
        // );
      });

      this.uCWasm.generateKeyShare(data, eventObj);
    });
  }

  sign(data) {
    return new Promise((resolve, reject) => {
      const eventObj = new EventEmitter();

      eventObj.once("end", (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(result.message);
        }
      });

      this.uCWasm.sign(data, eventObj);
    });
  }

  recoverShare(data) {
    return new Promise((resolve, reject) => {
      const eventObj = new EventEmitter();

      eventObj.once("end", (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(result.message);
        }
      });

      this.uCWasm.recoverShare(data, eventObj);
    });
  }

  unlock(data) {
    return new Promise((resolve, reject) => {
      const eventObj = new EventEmitter();

      eventObj.once("end", (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(result.message);
        }
      });

      this.uCWasm.unlock(data, eventObj);
    });
  }

  // changeActiveAccount(data) {
  //   return new Promise((resolve, reject) => {
  //     const eventObj = new EventEmitter();

  //     eventObj.once("end", (result) => {
  //       if (result.success) {
  //         resolve(result.data);
  //       } else {
  //         reject(result.message);
  //       }
  //     });

  //     this.uCWasm.changeActiveAccount(data, eventObj);
  //   });
  // }

  changePassword(dto) {
    return new Promise((resolve, reject) => {
      const eventObj = new EventEmitter();

      eventObj.once("end", (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(result.message);
        }
      });

      this.uCWasm.changePassword(dto, eventObj);
    });
  }
}
