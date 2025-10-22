import React from 'react';
import ReactDOM from 'react-dom';

import { App } from './features/app/components/App.web';
import { getLogger } from './features/base/logging/functions';
import Platform from './features/base/react/Platform.web';
import { getJitsiMeetGlobalNS, getJitsiMeetGlobalNSConnectionTimes } from './features/base/util/helpers';
import DialInSummaryApp from './features/invite/components/dial-in-summary/web/DialInSummaryApp';
import PrejoinApp from './features/prejoin/components/web/PrejoinApp';
import WhiteboardApp from './features/whiteboard/components/web/WhiteboardApp';
import StudentPortalApp from './features/student-portal/components/web/StudentPortalApp';
import StudentHomeworkApp from './features/homework/components/web/StudentHomeworkApp';
import HomeworkQuizApp from './features/homework/components/web/HomeworkQuizApp';
import HomeworkResultsApp from './features/homework/components/web/HomeworkResultsApp';
import TeacherHomeworkPage from './features/teacher-homework/components/web/TeacherHomeworkPage';
import StudentLeaderboardPage from './features/student-leaderboard/components/web/StudentLeaderboardPage';
import TeacherStudentsPage from './features/teacher-students/components/web/TeacherStudentsPage';

const logger = getLogger('app:index.web');

// Add global loggers.
window.addEventListener('error', ev => {
    logger.error(
        `UnhandledError: ${ev.message}`,
        `Script: ${ev.filename}`,
        `Line: ${ev.lineno}`,
        `Column: ${ev.colno}`,
        'StackTrace: ', ev.error?.stack);
});

window.addEventListener('unhandledrejection', ev => {
    logger.error(
        `UnhandledPromiseRejection: ${ev.reason}`,
        'StackTrace: ', ev.reason?.stack);
});

// Workaround for the issue when returning to a page with the back button and
// the page is loaded from the 'back-forward' cache on iOS which causes nothing
// to be rendered.
if (Platform.OS === 'ios') {
    window.addEventListener('pageshow', event => {
        // Detect pages loaded from the 'back-forward' cache
        // (https://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/)
        if (event.persisted) {
            // Maybe there is a more graceful approach but in the moment of
            // writing nothing else resolves the issue. I tried to execute our
            // DOMContentLoaded handler but it seems that the 'onpageshow' event
            // is triggered only when 'window.location.reload()' code exists.
            window.location.reload();
        }
    });
}

const globalNS = getJitsiMeetGlobalNS();
const connectionTimes = getJitsiMeetGlobalNSConnectionTimes();

// Used to check if the load event has been fired.
globalNS.hasLoaded = false;

// Used for automated performance tests.
connectionTimes['index.loaded'] = window.indexLoadedTime;

window.addEventListener('load', () => {
    connectionTimes['window.loaded'] = window.loadedEventTime;
    globalNS.hasLoaded = true;
});

document.addEventListener('DOMContentLoaded', () => {
    const now = window.performance.now();

    connectionTimes['document.ready'] = now;
    logger.log('(TIME) document ready:\t', now);
});

globalNS.entryPoints = {
    APP: App,
    PREJOIN: PrejoinApp,
    DIALIN: DialInSummaryApp,
    WHITEBOARD: WhiteboardApp,
    STUDENT_PORTAL: StudentPortalApp,
    STUDENT_HOMEWORK: StudentHomeworkApp,
    HOMEWORK_QUIZ: HomeworkQuizApp,
    HOMEWORK_RESULTS: HomeworkResultsApp,
    TEACHER_HOMEWORK: TeacherHomeworkPage,
    STUDENT_LEADERBOARD: StudentLeaderboardPage,
    TEACHER_STUDENTS: TeacherStudentsPage
};

globalNS.renderEntryPoint = ({
    Component,
    props = {},
    elementId = 'react'
}) => {
    /* eslint-disable-next-line react/no-deprecated */
    ReactDOM.render(
        <Component { ...props } />,
        document.getElementById(elementId)
    );
};
