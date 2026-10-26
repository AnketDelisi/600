import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scraper"))

import turnout_model


def main():
    serbia = turnout_model.prior("serbia")
    assert serbia and serbia["n"] == 4
    assert 55 < serbia["mean"] < 56
    assert serbia["sigma"] > 0
    assert turnout_model.scenario("serbia", 0) == serbia["mean"]
    assert turnout_model.actual("serbia")["turnout"] == 66.76
    assert turnout_model.scenarios("serbia")[1] == serbia["mean"]

    bulgaria = turnout_model.prior("bgpres")
    assert bulgaria and bulgaria["n"] == 3
    assert 49 < bulgaria["mean"] < 50
    assert turnout_model.actual("bgpres")["turnout"] == 21.91

    brazil = turnout_model.prior("brazil")
    assert brazil and brazil["n"] == 3
    assert 79 < brazil["mean"] < 80
    assert turnout_model.actual("brazil")["turnout"] == 80.78

    print("turnout model ok")


if __name__ == "__main__":
    main()
