const express = require("express");
const app = express();
const ModbusRTU = require("modbus-serial");
const dotenv = require("dotenv");
const axios = require("axios");
const schedule = require("node-schedule");
const logger = require("./src/config/logger");
const fs = require("fs");

dotenv.config();

suncheonmanseupji = new ModbusRTU();
jokokgyo = new ModbusRTU();
yongdangyo = new ModbusRTU();
wonyongdangyo = new ModbusRTU();

function fsRead() {
  dataBuffer = fs.readFileSync(__dirname + "/connectionStatus.json", "utf8");
  return JSON.parse(dataBuffer);
}

function fsWrite(place, param) {
  const status = fsRead();
  status[place] = param;
  dataJSON = JSON.stringify(status);
  fs.writeFileSync(__dirname + "/connectionStatus.json", dataJSON);
}

function connectionTcpPort() {
  if (fsRead().suncheonmanseupji === false) {
    suncheonmanseupji
      .connectTCP(process.env.SUNCHEONMANSEUPJI_IP, {
        port: process.env.SUNCHEONMANSEUPJI_PORT,
      })
      .then(() => {
        logger.info("suncheonmanseupji connectTCP SUCCESS");
        fsWrite("suncheonmanseupji", true);
      })
      .catch((e) => {
        logger.info("suncheonmanseupji connectTCP FAILURE");
      });
  }
  if (fsRead().jokokgyo === false) {
    jokokgyo
      .connectTCP(process.env.JOKOKGYO_IP, {
        port: process.env.JOKOKGYO_PORT,
      })
      .then(() => {
        logger.info("jokokgyo connectTCP SUCCESS");
        fsWrite("jokokgyo", true);
      })
      .catch((e) => {
        logger.info("jokokgyo connectTCP FAILURE");
      });
  }

  if (fsRead().yongdangyo === false) {
    yongdangyo
      .connectTCP(process.env.YONGDANGYO_IP, {
        port: process.env.YONGDANGYO_PORT,
      })
      .then(() => {
        logger.info("yongdangyo connectTCP SUCCESS");
        fsWrite("yongdangyo", true);
      })
      .catch((e) => {
        logger.info("yongdangyo connectTCP FAILURE");
      });
  }

  if (fsRead().wonyongdangyo === false) {
    wonyongdangyo
      .connectTCP(process.env.WONYONGDANGYO_IP, {
        port: process.env.WONYONGDANGYO_PORT,
      })
      .then(() => {
        logger.info("wonyongdangyo connectTCP SUCCESS");
        fsWrite("wonyongdangyo", true);
      })
      .catch((e) => {
        logger.info("wonyongdangyo connectTCP FAILURE");
      });
  }
}

fsWrite("suncheonmanseupji", false);
fsWrite("jokokgyo", false);
fsWrite("yongdangyo", false);
fsWrite("wonyongdangyo", false);

//===============10초  CONNECTION===============
schedule.scheduleJob("10 * * * * *", () => {
  connectionTcpPort();
});

//===============20초  CONNECTION===============
schedule.scheduleJob("20 * * * * *", () => {
  connectionTcpPort();
});

//===============30초  CONNECTION===============
schedule.scheduleJob("30 * * * * *", () => {
  connectionTcpPort();
});

//===============40초  CONNECTION===============
schedule.scheduleJob("40 * * * * *", () => {
  connectionTcpPort();
});

//===============50초  CONNECTION===============
schedule.scheduleJob("50 * * * * *", () => {
  connectionTcpPort();
});

// second, minute, hour, day of month, month, day of week
schedule.scheduleJob("00 * * * * *", async () => {
  suncheonmanseupji.readHoldingRegisters(100, 4, async (err, data) => {
    logger.info("suncheonmanseupji read connected");

    try {
      const getSensorData = data.data;

      const dataList = {
        place_id: process.env.SUNCHEONMANSEUPJI_PLACE_ID,
        precipitation: Number((getSensorData[0] * 0.1).toFixed(1)),
        temperature: Number((getSensorData[1] * 0.1).toFixed(1)),
        humidity: Number((getSensorData[2] * 0.1).toFixed(1)),
        water_level: Number((getSensorData[3] * 0.001).toFixed(3)),
      };

      const apiServerResult = await axios.post(process.env.APISERVER_URL, {
        dataList,
      });

      logger.info(apiServerResult.data.header.resultMsg);
    } catch (error) {
      fsWrite("suncheonmanseupji", false);
      if (error.name === "PortNotOpenError") {
        logger.error(`suncheonmanseupji 에러 :  PortNotOpenError`);
      } else {
        logger.error(`suncheonmanseupji 에러 : `, error);
      }
    }
  });

  jokokgyo.readHoldingRegisters(100, 4, async (err, data) => {
    logger.info("jokokgyo read connected");

    try {
      const getSensorData = data.data;

      const dataList = {
        place_id: process.env.JOKOKGYO_PLACE_ID,
        precipitation: Number((getSensorData[0] * 0.1).toFixed(1)),
        temperature: Number((getSensorData[1] * 0.1).toFixed(1)),
        humidity: Number((getSensorData[2] * 0.1).toFixed(1)),
        water_level: Number((getSensorData[3] * 0.001).toFixed(3)),
      };

      const apiServerResult = await axios.post(process.env.APISERVER_URL, {
        dataList,
      });

      logger.info(apiServerResult.data.header.resultMsg);
    } catch (error) {
      fsWrite("jokokgyo", false);
      if (error.name === "PortNotOpenError") {
        logger.error(`jokokgyo 에러 :  PortNotOpenError`);
      } else {
        logger.error(`jokokgyo 에러 : `, error);
      }
    }
  });

  yongdangyo.readHoldingRegisters(100, 4, async (err, data) => {
    logger.info("yongdangyo read connected");

    try {
      const getSensorData = data.data;

      const dataList = {
        place_id: process.env.YONGDANGYO_PLACE_ID,
        precipitation: Number((getSensorData[0] * 0.1).toFixed(1)),
        temperature: Number((getSensorData[1] * 0.1).toFixed(1)),
        humidity: Number((getSensorData[2] * 0.1).toFixed(1)),
        water_level: Number((getSensorData[3] * 0.001).toFixed(3)),
      };

      const apiServerResult = await axios.post(process.env.APISERVER_URL, {
        dataList,
      });
      logger.info(apiServerResult.data.header.resultMsg);
    } catch (error) {
      fsWrite("yongdangyo", false);
      if (error.name === "PortNotOpenError") {
        logger.error(`yongdangyo 에러 :  PortNotOpenError`);
      } else {
        logger.error(`yongdangyo 에러 : `, error);
      }
    }
  });

  wonyongdangyo.readHoldingRegisters(100, 4, async (err, data) => {
    logger.info("wonyongdangyo read connected");

    try {
      const getSensorData = data.data;

      const dataList = {
        place_id: process.env.WONYONGDANGYO_PLACE_ID,
        precipitation: Number((getSensorData[0] * 0.1).toFixed(1)),
        temperature: Number((getSensorData[1] * 0.1).toFixed(1)),
        humidity: Number((getSensorData[2] * 0.1).toFixed(1)),
        water_level: Number((getSensorData[3] * 0.001).toFixed(3)),
      };

      const apiServerResult = await axios.post(process.env.APISERVER_URL, {
        dataList,
      });

      logger.info(apiServerResult.data.header.resultMsg);
    } catch (error) {
      fsWrite("wonyongdangyo", false);
      if (error.name === "PortNotOpenError") {
        logger.error(`wonyongdangyo 에러 :  PortNotOpenError`);
      } else {
        logger.error(`wonyongdangyo 에러 : `, error);
      }
    }
  });
});

// second, minute, hour, day of month, month, day of week
schedule.scheduleJob("00 00 * * * *", async () => {
  suncheonmanseupji.writeCoil(0, 1, (err, data) => {
    logger.info(`suncheonmanseupji reset connected`);
    if (err) {
      fsWrite("suncheonmanseupji", false);
      logger.error(`suncheonmanseupji reset error : `, err);
    }
  });

  jokokgyo.writeCoil(0, 1, (err, data) => {
    logger.info(`jokokgyo reset connected`);
    if (err) {
      fsWrite("jokokgyo", false);
      logger.error(`jokokgyo reset error : `, err);
    }
  });

  yongdangyo.writeCoil(0, 1, (err, data) => {
    logger.info(`yongdangyo reset connected`);
    if (err) {
      fsWrite("yongdangyo", false);
      logger.error(`yongdangyo reset error : `, err);
    }
  });

  wonyongdangyo.writeCoil(0, 1, (err, data) => {
    logger.info(`wonyongdangyo reset connected`);
    if (err) {
      fsWrite("wonyongdangyo", false);
      logger.error(`wonyongdangyo reset error : `, err);
    }
  });
});

module.exports = app;
