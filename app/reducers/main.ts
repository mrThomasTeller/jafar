import { IAction } from 'actions/helpers';
import * as actions from 'actions/main';
import { IState } from 'types/main';

const initialState: IState = {
  from: '',
  to: '',
  where: '',
  matches: [],
  caseSensitive: true,
  regex: false,
  nonPrintableSymbols: false,
  preserveCase: false,
  wholeWords: false,
  oldContent: false
};

export default function main(state: IState = initialState, action: IAction) {
  if (actions.updateFormFields.test(action) || actions.updateSearchStatus.test(action)) {
    return { ...state, ...action.payload };
  }

  return state;
}
