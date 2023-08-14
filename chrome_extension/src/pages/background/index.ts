import reloadOnUpdate from "virtual:reload-on-update-in-background-script";
reloadOnUpdate("pages/background");
console.log("background@12345678 ");
import { createMachine, interpret } from 'xstate';
import { fromEvent } from 'rxjs';
import { from } from "rxjs";
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { mapValues } from "xstate/lib/utils";
interface ExternalMessage{
  message: any;
  sender: any;
  sendResponse: any;
}
async function fetchdata(context,event) {
  const { message, sender, sendResponse } = event;
  async function fetchdatainner(){
  if(event.type === 'EXTERNAL_MESSAGE'){
    try {
      const response = await fetch(message.link, {
        method: 'GET',
      });   
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("error bro", error);
      throw error;
    }
  }
}
async function fetchDataAndSendResponse() {
  try {
    const ip1 = await fetchdatainner();
    sendResponse(`ok${ip1.ip}`);
    
  } catch (error) {
    console.log("error bro", error);
  }
}
fetchDataAndSendResponse();
}
const serviceWorkerMachine = createMachine({
  id: 'serviceWorker',
  initial: 'registered',
  context: {
    externalMessage: null as ExternalMessage | null,
  },
  states: {
    registered: {
      on: {
        INSTALL: 'installed',
      },
    },
    installed: {
      on: {
        ACTIVATE:'activated'
      },
    },
    activated: {
      on: {
        EXTERNAL_MESSAGE: {
          target: 'processing',
        },
      },
    },
    processing: {
      invoke: {
        src: 'fetchdata',
        onDone:{
          actions:()=>{
            serviceWorkerService.send('MESSAGE_PROCESSED');
          }
        }
      },
      on: {
        MESSAGE_PROCESSED: {
          target: 'activated',
        },
      }
    },
     },
   },
   {
      services: {
         fetchdata, 
      },
   }
);

const serviceWorkerService = interpret(serviceWorkerMachine).start();
 serviceWorkerService.onTransition((state) => {
    console.log('Current State from xstate:', state.value);
    if(serviceWorkerService.state.matches('error')){
      console.log("error occured bro for the request.")
    }
   });
fromEvent(self, 'install').subscribe((event) => {
  //console.log(`service worker state now:---> ${event.type}`);
  serviceWorkerService.send('INSTALL');
});
fromEvent(self, 'activate').subscribe((event) => {
  //console.log(`service worker state now:---> ${event.type}`);
  serviceWorkerService.send('ACTIVATE');
});
const externalMessageSubject = new Subject<ExternalMessage>();
const service = interpret(serviceWorkerMachine).start();
externalMessageSubject.subscribe(({ message, sender, sendResponse }) => {
  serviceWorkerService.send({ type: 'EXTERNAL_MESSAGE', message, sender, sendResponse });
});
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  externalMessageSubject.next({
    message,
    sender,
    sendResponse,
  });
});











