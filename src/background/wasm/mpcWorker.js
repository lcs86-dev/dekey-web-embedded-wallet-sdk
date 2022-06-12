/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
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

// const {INVALID_CLIENT_MNEMONIC_ERROR} = require('../errorTypes')

if ("function" === typeof importScripts) {
  // importScripts('wasm.bundle.js');
  require("./wasm.exec.js");

  const go = new Go();
  let mod, inst;
  addEventListener(
    "message",
    async (e) => {
      if (e.data.eventType === "init") {
        // polyfill
        // if (!WebAssembly.instantiateStreaming) {
        //   WebAssembly.instantiateStreaming = async (resp, importObject) => {
        //     // self.postMessage({
        //     //   done: true,
        //     //   eventType: "wasm:loaded",
        //     //   msg: "",
        //     //   result: {},
        //     // });
        //     console.log("before !WebAssembly.instantiateStreaming in worker");
        //     const source = await (await resp).arrayBuffer();
        //     console.log("after await (await resp).arrayBuffer in worker");
        //     await WebAssembly.instantiate(source, importObject);
        //     console.log("after WebAssembly.instantiat in worker");

        //     return;
        //   };
        // }

        if (!WebAssembly.instantiateStreaming) {
          WebAssembly.instantiateStreaming = async (resp, importObject) => {
            const source = await (await resp).arrayBuffer();
            return await WebAssembly.instantiate(source, importObject);
          };
        }
        WebAssembly.instantiateStreaming(
          fetch("dkeyswasm.wasm"),
          go.importObject
        ).then(async (result) => {
          mod = result.module;
          inst = result.instance;

          self.postMessage({
            done: true,
            eventType: "wasm:loaded",
            msg: "",
            result: {},
          });
          await go.run(inst);
        });

        // WebAssembly.instantiateStreaming(
        //   fetch("dekeywasm.wasm"),
        //   go.importObject
        // ).then(async (result) => {
        //   console.log("after instantiateStreaming then in worker");
        //   console.log(result);
        //   mod = result.module;
        //   inst = result.instance;

        //   try {
        //     console.log("before await go.run(inst)");
        //     self.postMessage({
        //       done: true,
        //       eventType: "wasm:loaded",
        //       msg: "",
        //       result: {},
        //     });
        //     await go.run(inst);
        //   } catch (error) {
        //     console.error(error);
        //   }

        //   console.log("after go.run(inst) in worker");

        //   // done: true,
        //   // eventType: "sg",
        //   // msg: "Complete sign ...",
        //   // result: {
        //   //   success: true,
        //   //   data: JSON.parse(signResult),
        //   // },

        //   // emit wasm loaded event

        //   console.log("after wasm:loaded poastMessage in worker");
        // });
      } else if (e.data.eventType === "kg") {
        InitiateShares(e.data.dto);
      } else if (e.data.eventType === "sg") {
        Sign(e.data.arg);
      } else if (e.data.eventType === "self-sign") {
        SelfSign(e.data.arg);
      } else if (e.data.eventType === "show-mnemonic") {
        ShowMnemonic();
      } else if (e.data.eventType === "recover") {
        RecoverShare(e.data.dto);
      } else if (e.data.eventType === "recover-sid") {
        RecoverSID(e.data.dto, e.data.eventType);
      } else if (e.data.eventType === "send-cipher") {
        EmSeedRequest(e.data.dto, e.data.eventType);
      } else if (e.data.eventType === "em-recover") {
        EmRecover(e.data.dto, e.data.eventType);
      } else if (e.data.eventType === "unlock") {
        Unlock(e.data.dto, e.data.eventType);
      } else if (e.data.eventType === "changeActiveAccount") {
        ChangeActiveAccount(e.data.dto, e.data.eventType);
      } else if (e.data.eventType === "addAccount") {
        AddAccount(e.data.dto, e.data.eventType);
      } else if (e.data.eventType === "checkPassword") {
        CheckPassword(e.data.dto, e.data.eventType);
      } else if (e.data.eventType === "changePassword") {
        ChangePassword(e.data.dto, e.data.eventType);
      } else {
        self.postMessage({
          done: true,
          msg: "Invalid eventType",
        });
      }
    },
    false
  );
}

const ErrStr = "wasmerror";
const ErrMnemonicStr = "mnemonic is invalid";

var appPropNcloud = {
  csAddr: process.env.APP_SERVER_ADDRESS,
  useTLS: false,
  skipInsecureTLS: true,
};
var appProp1 = appPropNcloud;

var bgStatusKG = 0;
var bgStatusSG = 0;
var bgStatusRG = 0;
var bgStatusESR = 0;
var bgStatusAG = 0;

const UCID = 1;
const CSID = 2;
const RSID = 3;

////////////////////////////////// connect to
function ConnectTo(addr, path, useTLS, skipInsecureTLS, token) {
  return new WebSocket(`${process.env.MPC_PROTOCOL}://` + addr + path, token);
}

function InitiateShares(dto) {
  if (!bgStatusKG) {
    bgStatusKG = 1;
    // var appProp = appProp1;
    return connectToCSForKG(dto, appProp1);
  }
}

function connectToCSForKG(dto, appProp) {
  const { password, uid, wid, mpcToken } = dto;
  const authToken = mpcToken;
  const purposeCode = "KG";
  let EncPV;

  console.log("connectToCSForKG dto", dto);

  const rst = {
    user_id: uid,
    wallet_id: wid,
    start_datetime: "2020-01-01T11:32:00+09:00",
    end_datetime: "2120-01-05T11:32:00+09:00",
    purpose: "KG",
    dsa_mode: "ECDSA",
    curve_name: "secp256k1",
    share_mode: 1,
    wasm_enabled: true,
  };

  console.log("connectToCSForKG rst", rst);

  const csws = ConnectTo(
    appProp.csAddr,
    "/gen",
    appProp.useTLS,
    appProp.skipInsecureTLS,
    authToken
  );

  csws.addEventListener("open", function (event) {
    const sendData = {
      cmd: "req-init-conn",
      type: "app",
      purpose: purposeCode,
      auth_token: authToken,
    };
    csws.send(JSON.stringify(sendData));
  });

  csws.onerror = (event) => {
    console.log("csws error", error);
    csws?.close();
    rsws?.close();
    bgStatusKG = 0;
  };

  csws.onclose = (event) => {
    console.log("csws close", event);
  };

  let rsws;
  csws.onmessage = (event) => {
    try {
      let recData = JSON.parse(event.data);

      console.log("csws recData", recData);

      switch (recData.cmd) {
        case "res-init-conn":
          // JobID = recData.job_id;
          break;
        case "notify-rs-is-connected":
          // check if mpc rs address is equal to the recData addr which is sent from mpc cs server
          // if (process.env.MPC_RS_ADDRESS !== recData.addr) {
          //   throw new Error('MPC_RS_ADDRESS_MISMATCH_ERROR');
          // }
          rsws = connectToRSForKG(
            rst,
            appProp,
            recData.addr,
            recData.path,
            recData.job_id,
            csws,
            authToken
          );
          break;

        case "KGBC01":
          let sendDataKGBC01 = WASMKGFunction11(
            JSON.stringify(recData),
            CSID,
            uid,
            wid
          );
          if (sendDataKGBC01.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          csws.send(sendDataKGBC01);
          break;

        case "KGBC02":
          let sendDataKGBC02 = WASMKGFunction21(JSON.stringify(recData), CSID);
          if (sendDataKGBC02.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          csws.send(sendDataKGBC02);
          break;

        case "KGPS01":
          let sendDataKGPS01 = WASMKGFunction22(JSON.stringify(recData), CSID);
          if (sendDataKGPS01.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          csws.send(sendDataKGPS01);
          break;

        case "KGBC03":
          let sendDataKGBC03 = WASMKGFunction23(JSON.stringify(recData), CSID);
          if (!sendDataKGBC03 || sendDataKGBC03.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          csws.send(sendDataKGBC03);
          break;

        case "KGPS02": // CS only
          let sendDataPDLZK01 = WASMKGFunction31(JSON.stringify(recData), CSID); // return format is PDLZK01
          if (!sendDataPDLZK01 || sendDataPDLZK01.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          csws.send(sendDataPDLZK01);
          break;

        case "PDLZK02": // CS only
          let sendDataPDLZK03 = WASMKGFunction41(JSON.stringify(recData), CSID); // return format is PDLZK03
          if (!sendDataPDLZK03 || sendDataPDLZK03.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          csws.send(sendDataPDLZK03);
          break;

        case "PDLZK04": // CS only
          let sendDataKGPS03 = WASMKGFunction42(JSON.stringify(recData), CSID); // return format is PDLZK03
          if (!sendDataKGPS03 || sendDataKGPS03.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          csws.send(sendDataKGPS03);
          break;

        case "KGPS04": // CS only
          let isSuccess = WASMKGFunction51(JSON.stringify(recData), CSID); // return format is PDLZK03
          break;

        case "DBPS01": /// dummy always ok
          let dbok = { cmd: "DBPS01", is_ok: 1 };
          csws.send(JSON.stringify(dbok));
          break;

        case "DBPS02": /// final MpcRequest 마지막에는 양쪽에서 보내온 mpcrequest로 대사를 진행함
          console.log("DBPS02");
          let final_res = WASMKGFunction61(password);

          console.log("final_res", final_res);

          let r = JSON.parse(final_res);

          console.log("final_res r", r);

          csws.close();
          bgStatusKG = 0;

          self.postMessage({
            done: true,
            eventType: "kg",
            msg: "Complete key generation ...",
            result: {
              success: true,
              data: r,
            },
          });

          break;

        default:
      }
    } catch (error) {
      console.error(error);
      bgStatusKG = 0;
      csws?.close();
      rsws?.close();

      self.postMessage({
        done: true,
        eventType: "kg",
        msg: "Failed to generate key",
        result: {
          success: false,
          message: error.message,
        },
      });
    }
  };
}

function connectToRSForKG(rst, appProp, addr, path, JobID, csws, authToken) {
  let rsws = ConnectTo(
    addr,
    path,
    appProp.useTLS,
    appProp.skipInsecureTLS,
    authToken
  );
  const purposeCode = "KG";

  rsws.addEventListener("open", function (event) {
    let sendData = {
      cmd: "req-init-conn",
      type: "app",
      purpose: purposeCode,
      job_id: JobID,
      auth_token: authToken,
    };
    rsws.send(JSON.stringify(sendData));
  });

  rsws.onerror = (event) => {
    console.log("rsws error", error);
    csws?.close();
    rsws?.close();
    bgStatusKG = 0;
  };

  rsws.onclose = (event) => {
    console.log("rsws close", event);
  };

  rsws.onmessage = (event) => {
    let recData = JSON.parse(event.data);
    console.log("rsws recData", recData);
    try {
      switch (recData.cmd) {
        case "res-init-conn":
          let sendData = {
            cmd: "notify-all-connected",
            job_id: JobID,
            init: rst,
          };
          csws.send(JSON.stringify(sendData));
          rsws.send(JSON.stringify(sendData));
          break;
        case "notify-rs-is-connected":
          // console.log("RS says Connected well with RS ...");
          break;

        case "KGBC01":
          let sendDataKGBC01 = WASMKGFunction11(
            JSON.stringify(recData),
            RSID,
            rst.user_id,
            rst.wallet_id
          );
          if (sendDataKGBC01.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          rsws.send(sendDataKGBC01);
          break;

        case "KGBC02":
          let sendDataKGBC02 = WASMKGFunction21(JSON.stringify(recData), RSID);
          if (sendDataKGBC02.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          rsws.send(sendDataKGBC02);
          break;

        case "KGPS01":
          let sendDataKGPS01 = WASMKGFunction22(JSON.stringify(recData), RSID);
          if (sendDataKGPS01.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          rsws.send(sendDataKGPS01);
          break;

        case "KGBC03":
          let sendDataKGBC03 = WASMKGFunction23(JSON.stringify(recData), RSID);
          if (sendDataKGBC03.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          rsws.send(sendDataKGBC03);
          break;

        case "DBPS01": /// dummy always ok
          let dbok = { cmd: "DBPS01", is_ok: 1 };
          rsws.send(JSON.stringify(dbok));
          break;

        case "DBPS02": /// final MpcRequest 마지막에는 양쪽에서 보내온 mpcrequest로 대사를 진행함
          rsws.close();
          break;

        default:
      }
    } catch (error) {
      console.error(error);
      csws?.close();
      rsws?.close();
      bgStatusKG = 0;

      self.postMessage({
        done: true,
        eventType: "kg",
        msg: "Failed to generate key",
        result: {
          success: false,
          message: error.message,
        },
      });
    }
  };

  return rsws;
}

//////////////////////////////////// FOR SIGN

function Sign(dto) {
  if (!bgStatusSG) {
    bgStatusSG = 1;
    connectToCSForSign(dto, appProp1);
  }
}

function connectToCSForSign(dto, appProp) {
  const authToken = "DUMMYTOKEN";
  const purposeCode = "SG";

  const { txHash, accountId, mpcToken } = dto;

  const csws = ConnectTo(
    appProp.csAddr,
    `/sign?hash=${txHash}`,
    appProp.useTLS,
    appProp.skipInsecureTLS,
    mpcToken
  );

  csws.onerror = (event) => {
    bgStatusSG = 0;
    csws?.close();
    reject(event);
  };

  csws.addEventListener("open", function (event) {
    const sendData = {
      cmd: "req-init-conn",
      type: "app",
      purpose: purposeCode,
      auth_token: authToken,
    };
    csws.send(JSON.stringify(sendData));
  });

  csws.onmessage = (event) => {
    const recData = JSON.parse(event.data);
    try {
      switch (recData.cmd) {
        case "res-init-conn":
          const sendDataNotifyAllConnected = WASMSGFunction01(
            recData.job_id,
            txHash,
            accountId
          );
          if (sendDataNotifyAllConnected.indexOf(ErrStr) != -1) {
            // console.log(sendDataNotifyAllConnected);
            throw new Error(sendDataNotifyAllConnected);
          }

          csws.send(sendDataNotifyAllConnected);

          const sendDataSGPSVALILDENC = WASMSGSGPSVALILDENC(CSID);
          if (sendDataSGPSVALILDENC.indexOf(ErrStr) != -1) {
            throw new Error();
          }
          csws.send(sendDataSGPSVALILDENC);
          break;

        default:
      }

      if (recData.length >= 1) {
        switch (recData[0].cmd) {
          case "SGPS01":
            const sendDataSGPS02 = WASMSGFunction02(
              JSON.stringify(recData),
              CSID
            );
            if (sendDataSGPS02.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            csws.send(sendDataSGPS02);
            break;

          case "SGPS03":
            const sendDataSGPS04 = WASMSGFunction03(
              JSON.stringify(recData),
              CSID
            );
            if (sendDataSGPS04.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            csws.send(sendDataSGPS04);
            break;

          case "SGPS05":
            const signResult = WASMSGFunction04(JSON.stringify(recData), CSID);
            if (signResult.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            const otsGenResult = WASMSeedGeneration();
            if (otsGenResult.indexOf(ErrStr) != -1) {
              throw new Error();
            }

            csws?.close();
            bgStatusSG = 0;

            console.log("signResult", JSON.parse(signResult));

            self.postMessage({
              done: true,
              eventType: "sg",
              msg: "Complete sign ...",
              result: {
                success: true,
                data: JSON.parse(signResult),
              },
            });

            break;
          default:
            throw new Error();
        }
      }
    } catch (error) {
      csws?.close();
      bgStatusSG = 0;

      self.postMessage({
        done: true,
        eventType: "sg",
        msg: "Failed to sign",
        result: {
          success: false,
        },
      });
    }
  };

  return [csws, authToken];
}

//////////////////////////////////// FOR Key Share Recovery

function RecoverShare(dto) {
  if (!bgStatusRG) {
    var appProp = appProp1;
    const { password, uid, wid, sid, mpcToken } = dto;
    return connectToCSForRG(password, appProp, uid, wid, sid, mpcToken);
  }
}

function connectToCSForRG(
  aessource,
  appProp,
  userID,
  walletID,
  shareID,
  authToken
) {
  return new Promise((resolve, reject) => {
    // init rg process
    const res = WASMRGFunction00(userID, walletID, shareID);
    if (res.indexOf(ErrStr) != -1) {
      console.log(res);
      return;
    }

    // var authToken = 'DUMMYTOKEN';
    var purposeCode = "RG";
    ///////////////////////////////////////////
    // KG MpcRequest
    var rst = {
      user_id: userID,
      wallet_id: walletID,
      share_id: shareID,
      start_datetime: "2020-01-01T11:32:00+09:00",
      end_datetime: "2120-01-05T11:32:00+09:00",
      purpose: "RG",
      dsa_mode: "ECDSA",
      curve_name: "secp256k1",
      share_mode: 1,
      wasm_enabled: true,
    };

    let csws = ConnectTo(
      appProp.csAddr,
      "/gen",
      appProp.useTLS,
      appProp.skipInsecureTLS,
      authToken
    );
    let rsws;

    csws.addEventListener("open", function (event) {
      let sendData = {
        cmd: "req-init-conn",
        type: "app",
        purpose: purposeCode,
        auth_token: authToken,
      };
      csws.send(JSON.stringify(sendData));
    });

    csws.onmessage = (event) => {
      try {
        let recData = JSON.parse(event.data);
        let res;
        switch (recData.cmd) {
          case "res-init-conn":
            // JobID = recData.job_id;
            break;
          case "notify-rs-is-connected":
            rsws = connectToRSForRG(
              rst,
              appProp,
              recData.addr,
              recData.path,
              recData.job_id,
              csws,
              authToken,
              reject
            );
            break;

          case "VALIDDBPS01":
            res = WASMRGFunction01(JSON.stringify(recData), CSID);
            if (res.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            break;

          case "RGPS01":
            res = WASMRGFunction02(JSON.stringify(recData), CSID);
            if (res.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            const startMessage = {
              cmd: "RGSTART",
              source: 1,
              message: "READY",
            };
            rsws.send(JSON.stringify(startMessage));

            break;

          case "KGPS01":
            const sendDataKGPS01 = WASMRGFunction22(
              JSON.stringify(recData),
              CSID
            );
            if (sendDataKGPS01.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            csws.send(sendDataKGPS01);
            break;

          case "KGBC03":
            const sendDataKGBC03 = WASMRGFunction23(
              JSON.stringify(recData),
              CSID
            );
            if (sendDataKGBC03.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            csws.send(sendDataKGBC03);
            break;

          case "KGPS02": // CS only
            const sendDataPDLZK01 = WASMRGFunction31(
              JSON.stringify(recData),
              CSID
            ); // return format is PDLZK01
            if (sendDataPDLZK01.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            csws.send(sendDataPDLZK01);
            break;

          case "PDLZK02": // CS only
            const sendDataPDLZK03 = WASMRGFunction41(
              JSON.stringify(recData),
              CSID
            ); // return format is PDLZK03
            if (sendDataPDLZK03.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            csws.send(sendDataPDLZK03);
            break;

          case "PDLZK04": // CS only
            const sendDataKGPS03 = WASMRGFunction42(
              JSON.stringify(recData),
              CSID
            ); // return format is PDLZK03
            if (sendDataKGPS03.indexOf(ErrStr) != -1) {
              throw new Error();
            }
            csws.send(sendDataKGPS03);
            break;

          case "KGPS04": // CS only
            const isSuccess = WASMRGFunction51(JSON.stringify(recData), CSID); // return format is PDLZK03
            break;

          case "DBPS01": /// dummy always ok
            const dbok = { cmd: "DBPS01", is_ok: 1 };
            csws.send(JSON.stringify(dbok));
            break;

          case "DBPS02": /// final MpcRequest 마지막에는 양쪽에서 보내온 mpcrequest로 대사를 진행함
            const final_res = WASMRGFunction61(aessource);
            const r = JSON.parse(final_res);
            console.log("Uid", r.Uid);
            console.log("Wid", r.Wid);
            console.log("Sid", r.Sid);

            csws.close();

            self.postMessage({
              done: true,
              eventType: "recover",
              msg: "Complete recover ...",
              result: {
                success: true,
                data: r,
              },
            });

            break;

          default:
          // console.log(">>>>>>>>>>>>> CS UNCHECKED recData :", recData);
        }
      } catch (error) {
        csws?.close();
        bgStatusSG = 0;

        self.postMessage({
          done: true,
          eventType: "recover",
          msg: "Failed to recover",
          result: {
            success: false,
          },
        });
      }
    };
  });
}

function connectToRSForRG(
  rst,
  appProp,
  addr,
  path,
  JobID,
  csws,
  authToken,
  reject
) {
  let rsws = ConnectTo(
    addr,
    path,
    appProp.useTLS,
    appProp.skipInsecureTLS,
    authToken
  );
  var purposeCode = "RG";

  rsws.addEventListener("open", function (event) {
    let sendData = {
      cmd: "req-init-conn",
      type: "app",
      purpose: purposeCode,
      job_id: JobID,
      auth_token: authToken,
    };
    rsws.send(JSON.stringify(sendData));
  });

  rsws.onmessage = (event) => {
    const recData = JSON.parse(event.data);
    let res;
    switch (recData.cmd) {
      case "res-init-conn":
        const sendData = {
          cmd: "notify-all-connected",
          job_id: JobID,
          init: rst,
        };
        csws.send(JSON.stringify(sendData));
        rsws.send(JSON.stringify(sendData));
        break;
      case "notify-rs-is-connected":
        // console.log("RS says Connected well with RS ...");
        break;

      case "VALIDDBPS01":
        res = WASMRGFunction01(JSON.stringify(recData), RSID);
        if (res.indexOf(ErrStr) != -1) {
          console.log(res);
          csws.close();
          rsws.close();
          break;
        }
        break;

      case "RGPS01":
        res = WASMRGFunction02(JSON.stringify(recData), RSID);
        if (res.indexOf(ErrStr) != -1) {
          console.log(res);
          csws.close();
          rsws.close();
          break;
        }
        const startMessage = { cmd: "RGSTART", source: 1, message: "READY" };
        rsws.send(JSON.stringify(startMessage));
        csws.send(JSON.stringify(startMessage));

        break;

      case "KGPS01":
        const sendDataKGPS01 = WASMRGFunction22(JSON.stringify(recData), RSID);
        if (sendDataKGPS01.indexOf(ErrStr) != -1) {
          console.log(sendDataKGPS01);
          csws.close();
          rsws.close();
          break;
        }
        rsws.send(sendDataKGPS01);
        break;

      case "KGBC03":
        const sendDataKGBC03 = WASMRGFunction23(JSON.stringify(recData), RSID);
        if (sendDataKGBC03.indexOf(ErrStr) != -1) {
          console.log(sendDataKGBC03);
          csws.close();
          rsws.close();
          break;
        }
        rsws.send(sendDataKGBC03);
        break;

      case "DBPS01": /// dummy always ok
        const dbok = { cmd: "DBPS01", is_ok: 1 };
        rsws.send(JSON.stringify(dbok));
        break;

      case "DBPS02": /// final MpcRequest 마지막에는 양쪽에서 보내온 mpcrequest로 대사를 진행함
        rsws.close();

        break;

      default:
      // console.log(">>>>>>>>>>>>> RS UNCHECKED recData :", recData);
    }
  };

  return rsws;
}

//////////////////////////////////////////////////

function SelfSign(dto) {
  // console.log(dto);
  const { hashMessage } = dto;
  const self_sig = WASMUCSign(
    hashMessage //Number(12345).toString(16), //ConvertStringToHex("Atomrigs Lab"),
    // password,
    // EncPV
  );

  if (self_sig.indexOf(ErrStr) != -1) {
    self.postMessage({
      done: true,
      eventType: "self-sign",
      msg: self_sig,
      result: {
        success: false,
        message: self_sig,
      },
    });
  } else {
    // let sig = JSON.parse(self_sig);
    // self.postMessage({done: true, msg: 'Sig R:' + sig.r + ', Sig S:' + sig.s});
    self.postMessage({
      done: true,
      eventType: "self-sign",
      msg: "Complete SelfSign ...",
      result: {
        success: true,
        data: JSON.parse(self_sig),
      },
    });
  }
}

function ShowMnemonic() {
  let mnemonic = WASMShowMnemonic();
  if (mnemonic.indexOf(ErrStr) != -1) {
    self.postMessage({
      done: true,
      eventType: "show-mnemonic",
      result: {
        success: false,
        message: mnemonic,
      },
    });
  } else {
    self.postMessage({
      done: true,
      eventType: "show-mnemonic",
      result: {
        success: true,
        data: mnemonic,
      },
    });
  }
}

function RecoverSID(dto, eventType) {
  const { mnemonic, datetime } = dto;
  let res = WASMRGPrepare(mnemonic, datetime);
  if (res.indexOf(ErrStr) != -1) {
    self.postMessage({
      done: true,
      eventType,
      result: {
        success: false,
        message: res,
      },
    });
    return;
  }
  self.postMessage({
    done: true,
    eventType,
    result: {
      success: true,
      data: JSON.parse(res),
    },
  });
}

function EmRecover(dto, eventType) {
  const { mnemonic, cipher, numofaccounts } = dto;
  let res = WASMEmergentRecovery(mnemonic, cipher, Number(numofaccounts));

  if (res.indexOf(ErrStr) != -1) {
    self.postMessage({
      eventType,
      result: {
        success: false,
        // message: res.indexOf(ErrMnemonicStr) != -1 ? INVALID_CLIENT_MNEMONIC_ERROR : res,
        message: res,
      },
    });
  } else {
    // console.log('EmRecover success');
    self.postMessage({
      eventType,
      result: {
        success: true,
        data: JSON.parse(res),
      },
    });
  }
}

function Unlock(dto, eventType) {
  console.log("Worker unlock dto", dto);
  let { EncPV, password, hashMessage } = dto;
  let res = WASMUnlock(hashMessage, password, EncPV);

  if (res.indexOf(ErrStr) != -1) {
    self.postMessage({
      eventType,
      result: {
        success: false,
        message: res,
      },
    });
    return;
  }

  let r = JSON.parse(res);
  // if (r.Status == 'Migrated') {
  //   EncPV = r.PVEncStr;
  // }
  self.postMessage({
    eventType,
    result: {
      success: true,
      data: r,
    },
  });
}

function ChangeActiveAccount(dto, eventType) {
  const { accountId } = dto;
  let res = WASMChangeActiveAccount(accountId);
  if (res.indexOf(ErrStr) != -1) {
    self.postMessage({
      eventType,
      result: {
        success: false,
        message: res,
      },
    });
  } else {
    self.postMessage({
      eventType,
      result: {
        success: true,
        data: res,
      },
    });
  }
}

function CheckPassword(dto, eventType) {
  const { password, EncPV } = dto;

  let res = WASMPasswordCheck(password, EncPV);
  if (res == "verified") {
    self.postMessage({
      eventType,
      result: {
        success: true,
        message: res,
      },
    });
  } else {
    self.postMessage({
      eventType,
      result: {
        success: false,
      },
    });
  }
}

function ChangePassword({ oldAessource, newAessource, EncPV }, eventType) {
  const res = WASMPasswordChange(oldAessource, newAessource, EncPV);

  if (res.indexOf(ErrStr) != -1) {
    self.postMessage({
      eventType,
      result: {
        success: false,
      },
    });
  } else {
    const r = JSON.parse(res);
    self.postMessage({
      eventType,
      result: {
        success: true,
        data: r.PVEncStr,
      },
    });
  }
}
