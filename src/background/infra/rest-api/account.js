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

import { client } from "../../../util/apiClient";

export class AccountRestApi {
  registerUser = async (dto) => {
    try {
      const result = await client("v1/user/register", {
        data: dto,
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  recoverWallet = async (dto) => {
    try {
      const result = await client("v1/user/recover", {
        data: dto,
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  getUser = async (accessToken) => {
    try {
      const result = await client("v1/user/get", {
        data: {},
        token: accessToken,
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  getNewSessionJwt = async (accessToken) => {
    try {
      const result = await client("v1/user/accessToken/regen", {
        data: {},
        token: accessToken,
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  getChallengeMessage = async (sid) => {
    try {
      const result = await client("v1/user/challenge-message", {
        data: {
          sid,
        },
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  unlock = async (dto, accessToken) => {
    try {
      const result = await client("v1/user/unlock", {
        data: dto,
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  getMpcJwt = async (token) => {
    try {
      const res = await client("v1/address/auth/gen", {
        data: {},
        token,
      });

      return res.mpcJwt;
    } catch (error) {
      throw error;
    }
  };
}
