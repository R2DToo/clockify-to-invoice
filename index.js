import * as dotenv from "dotenv";
dotenv.config();
import schedule from "node-schedule";
import { DateTime, Duration } from "luxon";
import got from "got";

const API_KEY = process.env.CLOCKIFY_API_KEY;

const getTimecard = async (begOfMonth, endOfMonth) => {
  var ids = await getIds();
  // console.log("ids: ", ids);
  const start = begOfMonth.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  const end = endOfMonth.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  const timecards = await getRequest(
    `/api/v1/workspaces/${ids.workspace}/user/${ids.user}/time-entries?start=${start}&end=${end}&page-size=1000&hydrated=true`
  );
  //console.log("timecards:", timecards);
  var parsedTimecard = {};
  for (var x in timecards) {
    const timecard = timecards[x];
    const duration = Duration.fromISO(timecard.timeInterval.duration);
    // console.log("duration: ", duration.toObject());
    if (timecard.project.name in parsedTimecard) {
      parsedTimecard[timecard.project.name] = {
        duration: parsedTimecard[timecard.project.name].duration.plus(duration),
        hours:
          parsedTimecard[timecard.project.name].hours +
          duration.hours +
          duration.minutes / 60,
      };
    } else {
      parsedTimecard[timecard.project.name] = {
        duration: duration,
        hours: duration.hours + duration.minutes / 60,
      };
    }
  }
  for (var project in parsedTimecard) {
    console.log(
      `project: ${project} - hours: ${parsedTimecard[project].hours}`
    );
  }
};

const getIds = async () => {
  const response = await getRequest("/api/v1/user");
  const idObject = { user: response.id, workspace: response.activeWorkspace };
  return idObject;
};

console.log(
  `Starting scheduled job at: ${DateTime.now().toLocaleString(
    DateTime.DATETIME_MED_WITH_SECONDS
  )}`
);
// Actual schedule: * * 1 1 * *
// This is the first day of every month at 1AM
// Test schedule: */10 * * * * *
// This is every 10 seconds
const job = schedule.scheduleJob("*/10 * * * * *", async (fireDate) => {
  const fireDateTime = DateTime.fromJSDate(fireDate);
  console.log(
    `Running job at: ${fireDateTime.toLocaleString(
      DateTime.DATETIME_MED_WITH_SECONDS
    )}`
  );
  var lastMonth = fireDateTime.minus({ month: 1 });
  var begLastMonth = lastMonth.startOf("month");
  var endLastMonth = lastMonth.endOf("month");
  console.log(
    `Getting timecard for the period of ${begLastMonth.toLocaleString(
      DateTime.DATETIME_MED_WITH_SECONDS
    )} to ${endLastMonth.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}`
  );
  try {
    await getTimecard(begLastMonth, endLastMonth);
  } catch (error) {
    console.error(`ERROR ENCOUNTERED!! Terminating timecard request`);
  }
});

const getRequest = async (apiEndpoint) => {
  try {
    const response = await got(`https://api.clockify.me${apiEndpoint}`, {
      headers: { "X-Api-Key": API_KEY },
    }).json();
    // console.log(response);
    return response;
  } catch (error) {
    console.error(
      `ERROR CODE [${error.code}] - WHILE REQUESTING [${apiEndpoint}]`
    );
    // console.error(error);
  }
};
