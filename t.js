const schedule = require("node-schedule");
const logger = require("./src/config/logger");
const axios = require("axios");
const fs = require("fs");
const moment = require("moment");
const ModbusRTU = require("modbus-serial");

const MBS_STATE_INIT = "stat_init";
const MBS_STATE_NEXT = "state_next";
const MBS_STATE_GOOD_READ = "state_good_read";
const MBS_STATE_FAIL_READ = "state_fail_read";
const MBS_STATE_GOOD_CONNECT = "state_good_por";
const MBS_STATE_FAIL_CONNECT = "state_fail_port";

function run(placeList) {
  initialize(placeList);
  scheduleCycle(placeList);
  readSensorData(placeList);
  resetOneHourPrecipitation(placeList);
}

function initialize(placeList) {
  for (let i = 0; i < placeList.length; i++) {
    fsWrite(placeList[i].placeName, MBS_STATE_INIT);
  }
}

function scheduleCycle(placeList) {
  for (let i = 10; i < 60; i += 10) {
    schedule.scheduleJob(`${i} * * * * *`, () => {
      logger.info(`${i}초 때 스케줄 실행`);
      connection(placeList);
    });
  }
}

async function connection(placeList) {
  for (let i = 0; i < placeList.length; i++) {
    const mbState = fsRead()[placeList[i].placeName];
    if (
      mbState === MBS_STATE_INIT ||
      mbState === MBS_STATE_FAIL_CONNECT ||
      mbState === MBS_STATE_FAIL_READ
    ) {
      await placeList[i].objectName.close(() => {});
      await placeList[i].objectName
        .connectTCP(placeList[i].host, { port: placeList[i].port })
        .then(() => {
          logger.info(`${placeList[i].placeName} connectTCP SUCCESS`);
          fsWrite(placeList[i].placeName, MBS_STATE_GOOD_CONNECT);
          connectCount(placeList[i].placeName, "success");
        })
        .catch(() => {
          logger.info(`${placeList[i].placeName} connectTCP FAILURE`);
          fsWrite(placeList[i].placeName, MBS_STATE_FAIL_CONNECT);
          connectCount(placeList[i].placeName, "fail");
        });
    }
  }
}

function readSensorData(placeList) {
  schedule.scheduleJob("00 * * * * *", async () => {
    for (let i = 0; i < placeList.length; i++) {
      logger.info("readSensorData run");
      placeList[i].objectName
        .readHoldingRegisters(100, 4)
        .then(async (data) => {
          logger.info(placeList[i].placeName + " read connected");

          const getSensorData = await data.data;

          logger.info(getSensorData);

          const dataList = {
            place_id: placeList[i].placeId,
            precipitation: Number((getSensorData[0] * 0.1).toFixed(1)),
            temperature: Number((getSensorData[1] * 0.1).toFixed(1)),
            humidity: Number((getSensorData[2] * 0.1).toFixed(1)),
            water_level: Number((getSensorData[3] * 0.001).toFixed(1)),
          };

          const apiServerResult = await axios.post(process.env.APISERVER_URL, {
            dataList,
          });

          logger.info(apiServerResult.data.header.resultMsg);
          fsWrite(placeList[i].placeName, MBS_STATE_GOOD_READ);
        })
        .catch((e) => {
          if (placeList[i].objectName.isOpen) {
            fsWrite(placeList[i].placeName, MBS_STATE_NEXT);
          } else {
            fsWrite(placeList[i].placeName, MBS_STATE_FAIL_READ);
          }

          logger.error(
            placeList[i].placeName + " catch 에러 " + JSON.stringify(e)
          );
        });
    }
  });
}

function resetOneHourPrecipitation(placeList) {
  schedule.scheduleJob("00 00 * * * *", async () => {
    for (let i = 0; i < placeList.length; i++) {
      placeList[i].objectName
        .writeCoil(0, 1)
        .then((data) => {
          logger.info(placeList[i].placeName + ` reset connected`);
          fsWrite(placeList[i].placeName, MBS_STATE_GOOD_READ);
        })
        .catch((err) => {
          logger.error(`${placeList[i].placeName} reset error : `, err);
          fsWrite(placeList[i].placeName, MBS_STATE_FAIL_READ);
        });
    }
  });
}

function fsWrite(place, param) {
  const status = fsRead();
  status[place] = param;
  fs.writeFileSync(__dirname + "/connectionState.json", JSON.stringify(status));
}

function fsRead() {
  return JSON.parse(
    fs.readFileSync(__dirname + "/connectionState.json", "utf8")
  );
}

//==================================================================
function connectCount(placeName, propKey) {
  const today = moment().format("YYYYMMDD");
  let readData = ReadCountFile();
  if (readData[today] === undefined) {
    writeNewDateCountFile();
    readData = ReadCountFile();
  }
  readData[today][placeName][propKey] += 1;
  fs.writeFileSync("./count.json", JSON.stringify(readData));
}

function writeNewDateCountFile() {
  const readData = ReadCountFile();
  readData[moment().format("YYYYMMDD")] = {
    suncheonmanseupji: { success: 0, fail: 0 },
    jokokgyo: { success: 0, fail: 0 },
    yongdanggyo: { success: 0, fail: 0 },
    wonyongdanggyo: { success: 0, fail: 0 },
  };
  fs.writeFileSync("./count.json", JSON.stringify(readData));
}

function ReadCountFile() {
  return JSON.parse(fs.readFileSync("./count.json", "utf8"));
}

function transformObejctInArrayToSimpleArray(arr) {
  let transformArr = [];
  for (let i = 0; i < arr.length; i++) {
    transformArr.push(arr[i].place_id);
  }
  return transformArr;
}

// findWithoutPlaceId(
//   readInsertPlaceIdOfSensorData(),
//   readPlaceIdKinds(),
//   placeList
// );

async function readInsertPlaceIdOfSensorData() {
  try {
    const result = await axios.post(
      process.env.APISERVER_URL + "/insertdataplaceid",
      {
        start_date: moment().format("YYYY-MM-DD HH:mm:00"),
        end_date: moment().add(1, "minutes").format("YYYY-MM-DD HH:mm:00"),
      }
    );
    return result.data.body;
  } catch (error) {
    console.log(error);
    logger.error(error);
  }
}

async function readPlaceIdKinds() {
  try {
    const result = await axios.post(process.env.APISERVER_URL + "/placeid");

    return result.data.body;
  } catch (error) {
    logger.error(error);
  }
}

async function findWithoutPlaceId(arr1, arr2, placeList) {
  const a = await arr1;
  const b = await arr2;
  const transformArr1 = transformObejctInArrayToSimpleArray(a);
  const transformArr2 = transformObejctInArrayToSimpleArray(b);

  for (let j of transformArr2) {
    if (!transformArr1.includes(j)) {
      for (let i = 0; i < placeList.length; i++) {
        if (placeList[i].placeId === j.toString()) {
          fsWrite(placeList[i].placeName, false);
        }
      }
    }
  }
}

module.exports = run;
