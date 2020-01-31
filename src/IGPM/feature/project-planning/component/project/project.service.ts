/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {Injectable} from "@angular/core";
import {select, Store} from "@ngrx/store";
import {ActualData, ActualDataService} from "../../../../shared/business-domain";
import {Selectors} from "../../+state/project-planning-state.types";
import {
    ActualDataSumLoading,
    ActualDataSumLoadingFailure,
    ActualDataSumLoadingSuccess
} from "../../+state/actual-data-sum";
import {Observable} from "rxjs";
import {ServiceErrorCode} from "../../../../shared/constants";
import * as MESSAGES from "../../../../shared/constants/messages.constant";
import {SnackBarService} from "../../../../shared/notification";
import {ErrorHandlerService, DefaultErrorHandlerService} from "../../../../shared/error-handler";
import {filter, map, takeWhile} from "rxjs/operators";

@Injectable()
export class ProjectSandboxService {
    constructor(public store: Store<any>,
                private errorHandlerService: DefaultErrorHandlerService,
                public actualDataService: ActualDataService) {

    }

    private fromStore = {
        actualDataSum: {
            reload$: this.store.pipe(select(Selectors.actualDataSum.reload)),
            loading$: this.store.pipe(select(Selectors.actualDataSum.loading)),
            error$: this.store.pipe(select(Selectors.actualDataSum.error)),
            actualDataSum$: this.store.pipe(select(Selectors.actualDataSum.data))
        }
    };

    public data = {
        actualDataSumLoading$: this.fromStore.actualDataSum.loading$,
        actualDataSumError: this.fromStore.actualDataSum.error$,
        actualDataSum$ : this.fromStore.actualDataSum.actualDataSum$
    }

    /**
     * Returns error status of actual data sum request.
     * Only returns errors of monthly rates not found
     */
    public getActualDataSumError():Observable<boolean> {
        return this.fromStore.actualDataSum.error$.pipe(map(error => this.errorHandlerService.isRateNotFoundError(error)));
    }

    /**
     * Fetches summary of actual data
     * @param projectId
     * @param currencyId
     */
    public fetchActualDataSummary(projectId: number, currencyId? : number) {
        this.store.dispatch(new ActualDataSumLoading());
        this.actualDataService.getSumaryOfActualData(projectId,currencyId).subscribe((data:ActualData[]) => {
            this.store.dispatch(new ActualDataSumLoadingSuccess(data));
        }, error =>  {
            this.store.dispatch(new ActualDataSumLoadingFailure(error));
        });
    }

    /**
     * Fetches summary of actual data and returns
     * an Observable which can be subscribed to get data.
     * @param projectId
     * @param currencyId
     */
    public fetchActualDataSummaryObservable(projectId: number, currencyId? : number) : Observable<ActualData[]>{
        return new Observable<ActualData[]>( subscriber => {
            this.store.dispatch(new ActualDataSumLoading());
            this.actualDataService.getSumaryOfActualData(projectId,currencyId).subscribe((data:ActualData[]) => {
                this.store.dispatch(new ActualDataSumLoadingSuccess(data));
                subscriber.next(data);
            }, error =>  {
                this.store.dispatch(new ActualDataSumLoadingFailure(error));
                subscriber.error(error);
            });
        });
    }
}
