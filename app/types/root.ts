import { IState as IMainState } from 'types/main';

export interface IRootState {
    main: IMainState;
    routing: any;
}